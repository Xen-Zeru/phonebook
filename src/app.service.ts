import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { readFileSync } from 'fs';

@Injectable()
export class AppService {

  getHello(): string {
    return 'Hello from NestJS!';
  }
  
  getIndexHtml(): string {
    const pathToHtml = join(__dirname, '..', 'public', 'index.html');
    return readFileSync(pathToHtml, { encoding: 'utf-8' });
  }
}

