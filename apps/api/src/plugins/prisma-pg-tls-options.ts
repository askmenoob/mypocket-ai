import { readFileSync } from 'node:fs';
import { checkServerIdentity } from 'node:tls';

type PrismaPgOptions = {
  connectionString: string;
  ssl: {
    ca: string;
    rejectUnauthorized: true;
    checkServerIdentity: typeof checkServerIdentity;
  };
};

export function createPrismaPgOptions(connectionString: string): PrismaPgOptions {
  const caPath =
    process.env.POSTGRES_CA_CERT ||
    process.env.POSTGRES_TLS_CA_CERT ||
    '/etc/imai/postgres-tls/ca.crt';

  const ca = readFileSync(caPath, 'utf8');

  return {
    connectionString,
    ssl: {
      ca,
      rejectUnauthorized: true,
      checkServerIdentity,
    },
  };
}
