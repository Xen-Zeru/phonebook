import { Controller, Get, Res } from '@nestjs/common';
import { AppService } from './app.service';
import type { Response } from 'express';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('api/hello')
  getHello(): string {
    return this.appService.getHello();
  }

  @Get()
  serveIndex(@Res() res: Response) {
    const html = this.appService.getIndexHtml();
    res.type('html').send(html);
  }
}
