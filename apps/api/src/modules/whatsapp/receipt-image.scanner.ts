import {
  PDFDocument,
} from "pdf-lib";

import sharp, {
  type Sharp,
} from "sharp";


export interface ReceiptScanMedia {
  bytes:Uint8Array;
  mimeType:string;
  fileName:string;
}


export interface ReceiptScanResult {
  status:"success";
  ocrMedia:ReceiptScanMedia;
  archiveMedia:ReceiptScanMedia;
  boundaryDetected:boolean;
  perspectiveCorrected:boolean;
  deskewAngle:number;
  enhanced:boolean;
}


export type ReceiptOutputFormat =
  | "pdf"
  | "image";


export interface ReceiptScanOptions {
  outputFormat?:ReceiptOutputFormat;
}


export interface ReceiptImageScanner {
  validate?(input:ReceiptScanMedia):void;
  scan(
    input:ReceiptScanMedia,
    options?:ReceiptScanOptions,
  ):Promise<ReceiptScanResult>;
}


const MAX_RECEIPT_BYTES = 20 * 1024 * 1024;
const MAX_RECEIPT_PIXELS = 40_000_000;
const MAX_SCANNER_WORK_WIDTH = 1_200;
const MAX_SCANNER_WORK_HEIGHT = 1_600;

type Point = {x:number; y:number};


function distance(a:Point, b:Point):number{
  return Math.hypot(a.x - b.x, a.y - b.y);
}


function polygonArea(points:Point[]):number{
  let area = 0;
  for(let index = 0; index < points.length; index++){
    const current = points[index]!;
    const next = points[(index + 1) % points.length]!;
    area += current.x * next.y - next.x * current.y;
  }
  return Math.abs(area) / 2;
}


function average(values:number[]):number{
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}


function detectDocumentCorners(
  data:Buffer,
  width:number,
  height:number,
  channels:number,
):Point[] | null{
  const borderSamples:number[] = [];
  const borderStride = Math.max(1, Math.floor(Math.min(width, height) / 80));
  for(let x = 0; x < width; x += borderStride){
    for(const y of [0, height - 1]){
      const offset = (y * width + x) * channels;
      borderSamples.push(
        0.2126 * data[offset]!
        + 0.7152 * data[offset + 1]!
        + 0.0722 * data[offset + 2]!,
      );
    }
  }
  for(let y = 0; y < height; y += borderStride){
    for(const x of [0, width - 1]){
      const offset = (y * width + x) * channels;
      borderSamples.push(
        0.2126 * data[offset]!
        + 0.7152 * data[offset + 1]!
        + 0.0722 * data[offset + 2]!,
      );
    }
  }
  const borderLuma = average(borderSamples);
  const threshold = Math.min(238, Math.max(145, borderLuma + 28));
  const rows:{y:number; minX:number; maxX:number; count:number}[] = [];

  for(let y = 0; y < height; y++){
    let minX = width;
    let maxX = -1;
    let count = 0;
    for(let x = 0; x < width; x++){
      const offset = (y * width + x) * channels;
      const red = data[offset]!;
      const green = data[offset + 1]!;
      const blue = data[offset + 2]!;
      const luma = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
      const saturation = Math.max(red, green, blue) - Math.min(red, green, blue);
      if(luma >= threshold && saturation <= 72){
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        count += 1;
      }
    }
    if(count >= width * 0.12 && maxX - minX >= width * 0.12){
      rows.push({y, minX, maxX, count});
    }
  }

  if(rows.length < height * 0.18){
    return null;
  }
  const band = Math.max(3, Math.floor(rows.length * 0.08));
  const topRows = rows.slice(0, band);
  const bottomRows = rows.slice(-band);
  const corners = [
    {x:average(topRows.map(row => row.minX)), y:average(topRows.map(row => row.y))},
    {x:average(topRows.map(row => row.maxX)), y:average(topRows.map(row => row.y))},
    {x:average(bottomRows.map(row => row.maxX)), y:average(bottomRows.map(row => row.y))},
    {x:average(bottomRows.map(row => row.minX)), y:average(bottomRows.map(row => row.y))},
  ];
  const ratio = polygonArea(corners) / (width * height);
  if(
    ratio < 0.16
    || ratio > 0.96
    || distance(corners[0]!, corners[1]!) < width * 0.15
    || distance(corners[3]!, corners[2]!) < width * 0.15
  ){
    return null;
  }
  return corners;
}


function solveLinearSystem(matrix:number[][], values:number[]):number[]{
  const size = values.length;
  const augmented = matrix.map((row, index) => [...row, values[index]!]);
  for(let column = 0; column < size; column++){
    let pivot = column;
    for(let row = column + 1; row < size; row++){
      if(Math.abs(augmented[row]![column]!) > Math.abs(augmented[pivot]![column]!)){
        pivot = row;
      }
    }
    [augmented[column], augmented[pivot]] = [augmented[pivot]!, augmented[column]!];
    const divisor = augmented[column]![column]!;
    if(Math.abs(divisor) < 1e-9){
      throw new Error("RECEIPT_PERSPECTIVE_SINGULAR");
    }
    for(let index = column; index <= size; index++){
      augmented[column]![index] = augmented[column]![index]! / divisor;
    }
    for(let row = 0; row < size; row++){
      if(row === column){
        continue;
      }
      const factor = augmented[row]![column]!;
      for(let index = column; index <= size; index++){
        augmented[row]![index] -= factor * augmented[column]![index]!;
      }
    }
  }
  return augmented.map(row => row[size]!);
}


function homographyFromRectangle(
  width:number,
  height:number,
  source:Point[],
):number[]{
  const target = [
    {x:0, y:0},
    {x:width - 1, y:0},
    {x:width - 1, y:height - 1},
    {x:0, y:height - 1},
  ];
  const matrix:number[][] = [];
  const values:number[] = [];
  for(let index = 0; index < 4; index++){
    const {x, y} = target[index]!;
    const {x:u, y:v} = source[index]!;
    matrix.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    values.push(u);
    matrix.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    values.push(v);
  }
  return [...solveLinearSystem(matrix, values), 1];
}


function warpPerspective(
  data:Buffer,
  sourceWidth:number,
  sourceHeight:number,
  channels:number,
  corners:Point[],
):{data:Buffer; width:number; height:number}{
  const naturalWidth = Math.max(
    distance(corners[0]!, corners[1]!),
    distance(corners[3]!, corners[2]!),
  );
  const naturalHeight = Math.max(
    distance(corners[0]!, corners[3]!),
    distance(corners[1]!, corners[2]!),
  );
  const scale = Math.min(1, 1800 / naturalWidth, 2400 / naturalHeight);
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));
  const transform = homographyFromRectangle(width, height, corners);
  const output = Buffer.alloc(width * height * 3, 255);

  for(let y = 0; y < height; y++){
    for(let x = 0; x < width; x++){
      const denominator = transform[6]! * x + transform[7]! * y + 1;
      const sourceX = (transform[0]! * x + transform[1]! * y + transform[2]!) / denominator;
      const sourceY = (transform[3]! * x + transform[4]! * y + transform[5]!) / denominator;
      const nearestX = Math.min(sourceWidth - 1, Math.max(0, Math.round(sourceX)));
      const nearestY = Math.min(sourceHeight - 1, Math.max(0, Math.round(sourceY)));
      const sourceOffset = (nearestY * sourceWidth + nearestX) * channels;
      const targetOffset = (y * width + x) * 3;
      output[targetOffset] = data[sourceOffset]!;
      output[targetOffset + 1] = data[sourceOffset + 1]!;
      output[targetOffset + 2] = data[sourceOffset + 2]!;
    }
  }
  return {data:output, width, height};
}


export class ReceiptMediaValidationError extends Error {}


export function validateReceiptImageMedia(input:ReceiptScanMedia):void{
  if(
    input.bytes.length === 0
    || input.bytes.length > MAX_RECEIPT_BYTES
  ){
    throw new ReceiptMediaValidationError("RECEIPT_IMAGE_SIZE_INVALID");
  }

  if(!detectedMimeType(input.bytes)){
    throw new ReceiptMediaValidationError("RECEIPT_IMAGE_SIGNATURE_INVALID");
  }
}


function detectedMimeType(bytes:Uint8Array):string | null{
  if(
    bytes.length >= 3
    && bytes[0] === 0xff
    && bytes[1] === 0xd8
    && bytes[2] === 0xff
  ){
    return "image/jpeg";
  }

  if(
    bytes.length >= 8
    && bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4e
    && bytes[3] === 0x47
    && bytes[4] === 0x0d
    && bytes[5] === 0x0a
    && bytes[6] === 0x1a
    && bytes[7] === 0x0a
  ){
    return "image/png";
  }

  if(
    bytes.length >= 12
    && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
    && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ){
    return "image/webp";
  }

  return null;
}


function safeBaseName(fileName:string):string{
  const normalized = fileName
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/\.[^.]+$/, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return normalized || "receipt";
}


async function buildPdf(
  pngBytes:Uint8Array,
  width:number,
  height:number,
):Promise<Uint8Array>{
  const pdf = await PDFDocument.create();
  const image = await pdf.embedPng(pngBytes);
  const maxPageWidth = 595.28;
  const maxPageHeight = 841.89;
  const scale = Math.min(
    maxPageWidth / width,
    maxPageHeight / height,
    1,
  );
  const pageWidth = Math.max(1, width * scale);
  const pageHeight = Math.max(1, height * scale);
  const page = pdf.addPage([pageWidth, pageHeight]);
  page.drawImage(image, {
    x:0,
    y:0,
    width:pageWidth,
    height:pageHeight,
  });

  return pdf.save({
    useObjectStreams:true,
  });
}


async function estimateDeskewAngle(input:Sharp):Promise<number>{
  const sample = await input
    .clone()
    .resize({width:700, height:900, fit:"inside", withoutEnlargement:true})
    .greyscale()
    .raw()
    .toBuffer({resolveWithObject:true});
  const {width, height} = sample.info;
  const centerX = (width - 1) / 2;
  const centerY = (height - 1) / 2;
  let bestAngle = 0;
  let bestScore = -Infinity;

  for(let angle = -6; angle <= 6; angle += 0.75){
    const radians = angle * Math.PI / 180;
    const sin = Math.sin(radians);
    const cos = Math.cos(radians);
    const rows = new Float64Array(height + 32);

    for(let y = 0; y < height; y += 2){
      for(let x = 0; x < width; x += 2){
        const value = sample.data[y * width + x]!;
        if(value > 150){
          continue;
        }
        const projectedY = Math.round(
          (x - centerX) * sin
          + (y - centerY) * cos
          + centerY
          + 16,
        );
        if(projectedY >= 0 && projectedY < rows.length){
          rows[projectedY] += (150 - value) / 150;
        }
      }
    }

    let score = 0;
    for(let index = 1; index < rows.length; index++){
      const delta = rows[index]! - rows[index - 1]!;
      score += delta * delta;
    }
    if(score > bestScore){
      bestScore = score;
      bestAngle = angle;
    }
  }

  return Math.abs(bestAngle) >= 0.75
    ? Math.round(bestAngle * 100) / 100
    : 0;
}


export class SmartReceiptImageScanner
implements ReceiptImageScanner {

  validate(input:ReceiptScanMedia):void{
    validateReceiptImageMedia(input);
  }

  async scan(
    input:ReceiptScanMedia,
    options:ReceiptScanOptions = {},
  ):Promise<ReceiptScanResult>{
    this.validate(input);

    const source = sharp(input.bytes, {
      failOn:"error",
      limitInputPixels:MAX_RECEIPT_PIXELS,
      sequentialRead:true,
    }).autoOrient();
    const oriented = await source.png().toBuffer({resolveWithObject:true});

    const scannerInput = await sharp(oriented.data, {
      failOn:"error",
      limitInputPixels:MAX_RECEIPT_PIXELS,
    })
      .resize({
        width:MAX_SCANNER_WORK_WIDTH,
        height:MAX_SCANNER_WORK_HEIGHT,
        fit:"inside",
        withoutEnlargement:true,
      })
      .png()
      .toBuffer({resolveWithObject:true});

    let working = sharp(scannerInput.data, {
      failOn:"error",
      limitInputPixels:MAX_RECEIPT_PIXELS,
    });
    let boundaryDetected = false;
    let perspectiveCorrected = false;

    try{
      const raw = await sharp(scannerInput.data)
        .removeAlpha()
        .raw()
        .toBuffer({resolveWithObject:true});
      const corners = detectDocumentCorners(
        raw.data,
        raw.info.width,
        raw.info.height,
        raw.info.channels,
      );
      if(corners){
        const warped = warpPerspective(
          raw.data,
          raw.info.width,
          raw.info.height,
          raw.info.channels,
          corners,
        );
        working = sharp(warped.data, {
          raw:{width:warped.width, height:warped.height, channels:3},
        });
        boundaryDetected = true;
        perspectiveCorrected = true;
      }
    }catch{
      // Four-corner correction is best effort; trim/deskew still follow.
    }

    try{
      const trimmed = await working
        .clone()
        .trim({threshold:18, lineArt:true})
        .png()
        .toBuffer({resolveWithObject:true});
      const sourceArea = scannerInput.info.width * scannerInput.info.height;
      const trimmedArea = trimmed.info.width * trimmed.info.height;
      const retainedRatio = trimmedArea / sourceArea;

      if(retainedRatio >= 0.2 && retainedRatio <= 0.98){
        working = sharp(trimmed.data, {
          failOn:"error",
          limitInputPixels:MAX_RECEIPT_PIXELS,
        });
        boundaryDetected = true;
      }
    }catch{
      // A document boundary is an enhancement, never a transaction gate.
    }

    let deskewAngle = 0;
    try{
      deskewAngle = await estimateDeskewAngle(working);
      if(deskewAngle !== 0){
        working = working.rotate(deskewAngle, {background:"#ffffff"});
      }
    }catch{
      deskewAngle = 0;
    }

    const scanned = await working
      .resize({
        width:1800,
        height:2400,
        fit:"inside",
        withoutEnlargement:true,
      })
      .greyscale()
      .normalize({lower:1, upper:99})
      .sharpen({sigma:1})
      .png({compressionLevel:9})
      .toBuffer({resolveWithObject:true});
    const baseName = safeBaseName(input.fileName);
    const ocrPngBytes = new Uint8Array(scanned.data);
    const fullColourPngBytes = new Uint8Array(oriented.data);
    const keepImage =
      options.outputFormat === "image";

    const archiveMedia:ReceiptScanMedia =
      keepImage
        ? {
            bytes:fullColourPngBytes,
            mimeType:"image/png",
            fileName:`${baseName}-scan.png`,
          }
        : {
            bytes:await buildPdf(
              fullColourPngBytes,
              oriented.info.width,
              oriented.info.height,
            ),
            mimeType:"application/pdf",
            fileName:`${baseName}-scan.pdf`,
          };

    return {
      status:"success",
      ocrMedia:{
        bytes:ocrPngBytes,
        mimeType:"image/png",
        fileName:`${baseName}-scan.png`,
      },
      archiveMedia,
      boundaryDetected,
      perspectiveCorrected,
      deskewAngle,
      enhanced:true,
    };
  }
}


export class PassthroughReceiptImageScanner
implements ReceiptImageScanner {
  async scan(input:ReceiptScanMedia):Promise<ReceiptScanResult>{
    return {
      status:"success",
      ocrMedia:input,
      archiveMedia:input,
      boundaryDetected:false,
      perspectiveCorrected:false,
      deskewAngle:0,
      enhanced:false,
    };
  }
}
