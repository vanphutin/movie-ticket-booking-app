import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterRequestDto {
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty()
  @MaxLength(254)
  readonly email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(12, { message: 'Password must be at least 12 characters long' })
  @MaxLength(128)
  readonly password!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  readonly displayName!: string;
}

export class LoginRequestDto {
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty()
  @MaxLength(254)
  readonly email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(128)
  readonly password!: string;
}

export class RefreshRequestDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(2048, { message: 'Refresh token must not exceed 2048 characters' })
  readonly refreshToken!: string;
}

export class LogoutRequestDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(2048, { message: 'Refresh token must not exceed 2048 characters' })
  readonly refreshToken!: string;
}

export {
  RegisterRequestDto as RegisterDto,
  LoginRequestDto as LoginDto,
  RefreshRequestDto as RefreshDto,
  LogoutRequestDto as LogoutDto,
};
