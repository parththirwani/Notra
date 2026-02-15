import { PrismaPg } from '@prisma/adapter-pg';
import { getPostgresPool } from './pg';

export function createPrismaAdapter() {
  const pool = getPostgresPool();
  return new PrismaPg(pool);
}