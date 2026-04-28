import { Controller, Get, Delete, Param } from '@nestjs/common';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get('paths')
  getPaths() {
    return this.mediaService.getPaths();
  }

  @Get('list')
  getConnections() {
    return this.mediaService.getConnections();
  }

  @Get('rtmp')
  getRTMPConnections() {
    return this.mediaService.getRTMPConnections();
  }

  @Get('stream/:name')
  getStreamDetails(@Param('name') name: string) {
    return this.mediaService.getPathDetails(name);
  }

  @Delete('stream/:name')
  kickStream(@Param('name') name: string) {
    return this.mediaService.kickPath(name);
  }
}
