export type WhatsAppMediaMetric =
  | "incoming_media"
  | "ignored_no_intent"
  | "classification_request"
  | "classified_receipt"
  | "classified_non_receipt"
  | "scan_success"
  | "scan_fallback"
  | "pdf_generated";


export type WhatsAppMediaMetricSnapshot =
  Readonly<Record<WhatsAppMediaMetric, number>>;


const EMPTY_SNAPSHOT:WhatsAppMediaMetricSnapshot = {
  incoming_media:0,
  ignored_no_intent:0,
  classification_request:0,
  classified_receipt:0,
  classified_non_receipt:0,
  scan_success:0,
  scan_fallback:0,
  pdf_generated:0,
};


export class WhatsAppMediaTelemetry {
  private readonly counts = {...EMPTY_SNAPSHOT};

  record(metric:WhatsAppMediaMetric):WhatsAppMediaMetricSnapshot{
    this.counts[metric] += 1;
    return this.snapshot();
  }

  snapshot():WhatsAppMediaMetricSnapshot{
    return Object.freeze({...this.counts});
  }
}


export type WhatsAppMediaMetricObserver =
  (metric:WhatsAppMediaMetric) => void;
