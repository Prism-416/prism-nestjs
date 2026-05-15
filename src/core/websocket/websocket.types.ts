import type { Socket } from 'socket.io';
import type { JwtPayload } from '@/core/auth';

export type AuthenticatedSocketData = {
  user?: JwtPayload;
};

export type AuthenticatedSocket<
  ListenEvents extends Record<string, (...args: any[]) => void> = Record<
    string,
    (...args: any[]) => void
  >,
  EmitEvents extends Record<string, (...args: any[]) => void> = Record<
    string,
    (...args: any[]) => void
  >,
  ServerSideEvents extends Record<string, (...args: any[]) => void> = Record<
    string,
    (...args: any[]) => void
  >,
  SocketData extends AuthenticatedSocketData = AuthenticatedSocketData,
> = Socket<ListenEvents, EmitEvents, ServerSideEvents, SocketData>;
