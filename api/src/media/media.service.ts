import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MediaService {
  private readonly mediaServerUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.mediaServerUrl = this.configService.get<string>(
      'MEDIA_SERVER_URL',
      'http://localhost:9997',
    );
  }

  async getPaths() {
    const res = await this.fetchFromMediaServer('/v3/paths/list');
    return res;
  }

  async getConnections() {
    const res = await this.fetchFromMediaServer('/v3/hlsmuxers/list');
    return res;
  }

  async getRTMPConnections() {
    const res = await this.fetchFromMediaServer('/v3/rtmpconns/list');
    return res;
  }

  async getPathDetails(name: string) {
    const res = await this.fetchFromMediaServer(
      `/v3/paths/get/${encodeURIComponent(name)}`,
    );
    return res;
  }

  async kickPath(name: string) {
    const url = `${this.mediaServerUrl}/v3/paths/kick/${encodeURIComponent(name)}`;
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) {
      throw new HttpException(
        `Failed to kick path: ${name}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
    return { success: true, message: `Path ${name} kicked` };
  }

  private async fetchFromMediaServer(endpoint: string) {
    const url = `${this.mediaServerUrl}${endpoint}`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new HttpException(
          `Media server responded with ${res.status}`,
          HttpStatus.BAD_GATEWAY,
        );
      }
      return res.json();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Media server is unreachable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
