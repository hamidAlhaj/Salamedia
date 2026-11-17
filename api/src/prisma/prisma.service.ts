import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // PRISMA_LOG_QUERIES=1 prints every SQL query (used to prove there is no N+1). Off by default.
    super(process.env.PRISMA_LOG_QUERIES === '1' ? { log: [{ emit: 'stdout', level: 'query' }] } : {});
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
