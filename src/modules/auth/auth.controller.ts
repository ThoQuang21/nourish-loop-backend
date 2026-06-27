import { Body, Controller, Get, Headers, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

/** Lấy token từ header "Authorization: Bearer <token>". */
function extractBearer(header?: string): string | undefined {
  if (!header) {
    return undefined;
  }
  const [type, token] = header.split(' ');
  return type === 'Bearer' && token ? token : undefined;
}

/**
 * Routes: /api/auth/* — đăng ký, đăng nhập, đăng xuất (session token, không JWT).
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Headers('authorization') authorization?: string) {
    return this.authService.logout(extractBearer(authorization));
  }

  @Get('me')
  me(@Headers('authorization') authorization?: string) {
    return this.authService.me(extractBearer(authorization));
  }
}
