import { Controller, Get, Param, Query } from '@nestjs/common';
import { QueryPublicPostDto } from './dto/query-post.dto';
import { ReceiverService } from './receiver.service';

/**
 * Browse tin công khai cho receiver. Route: /api/posts (không cần đăng nhập).
 */
@Controller('posts')
export class PublicPostsController {
  constructor(private readonly receiverService: ReceiverService) {}
<<<<<<< HEAD

=======
>>>>>>> db0bc37e31a11da46111f86219627ac508a6257a
  @Get()
  findAll(@Query() query: QueryPublicPostDto) {
    return this.receiverService.listPosts(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.receiverService.getPost(id);
  }
}
