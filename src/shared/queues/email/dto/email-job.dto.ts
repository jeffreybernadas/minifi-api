import { IsEmail, IsNotEmpty, IsString, IsOptional } from 'class-validator';

/**
 * DTO for sending email job
 * Used when publishing email tasks to RabbitMQ queue
 */
export class SendEmailJobDto {
  /**
   * User ID (Keycloak sub) - Optional but recommended for registered users.
   *
   * **When to provide:**
   * - For registered user notifications (security alerts, expiring links, reports)
   * - Enables preference check (respects `emailNotificationsEnabled`)
   * - Uses canonical email from database
   *
   * **When to omit:**
   * - Guest/anonymous transactional emails
   * - System emails not tied to a user account
   */
  @IsString()
  @IsOptional()
  userId?: string;

  @IsEmail()
  @IsNotEmpty()
  to: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  html: string;

  @IsString()
  @IsOptional()
  from?: string;
}
