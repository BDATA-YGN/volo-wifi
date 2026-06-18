import { Route } from '@/interfaces/express.interface';
import { Router } from 'express';
import { AuthMiddleware } from '@/middlewares/auth.middleware';
import { ConversationController } from './controller';

/**
 * Conversation routes — HR / System domain.
 *
 *   GET    /conversations                                inbox for the current admin
 *   GET    /conversations/recipients                     admins available to DM
 *   GET    /conversations/:id                            detail + participants
 *   GET    /conversations/:id/messages                   paginated message history
 *   GET    /conversations/:id/candidates                 addable admins (owner-only)
 *   POST   /conversations/direct                         start (or reopen) a DM
 *   POST   /conversations/broadcast                      broadcast to every admin
 *   POST   /conversations/:id/messages                   send into existing thread
 *   POST   /conversations/:id/read                       mark caller's lastReadAt
 *   POST   /conversations/:id/participants                add admins (owner-only)
 *   DELETE /conversations/:id/participants/:adminId      remove admin (owner-only)
 *   DELETE /conversations/delete/:id                     soft delete (creator only)
 */
export class ConversationRoute implements Route {
  public path = '/conversations';
  public router = Router();
  private controller = new ConversationController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Static paths first — otherwise `recipients`, `direct`, `broadcast`
    // get captured by the `/:id` matchers below.
    this.router.get(`${this.path}/recipients`, AuthMiddleware, this.controller.listRecipients);
    this.router.get(`${this.path}/:id/candidates`, AuthMiddleware, this.controller.listCandidates);
    this.router.get(`${this.path}/:id/messages`, AuthMiddleware, this.controller.listMessages);
    this.router.get(`${this.path}/:id`, AuthMiddleware, this.controller.getDetails);
    this.router.get(`${this.path}`, AuthMiddleware, this.controller.listInbox);

    this.router.post(`${this.path}/direct`, AuthMiddleware, this.controller.startDirect);
    this.router.post(`${this.path}/broadcast`, AuthMiddleware, this.controller.startBroadcast);
    this.router.post(`${this.path}/:id/messages`, AuthMiddleware, this.controller.sendMessage);
    this.router.post(`${this.path}/:id/participants`, AuthMiddleware, this.controller.addParticipants);
    this.router.post(`${this.path}/:id/read`, AuthMiddleware, this.controller.markAsRead);

    this.router.delete(
      `${this.path}/:id/participants/:adminId`,
      AuthMiddleware,
      this.controller.removeParticipant,
    );
    this.router.delete(`${this.path}/delete/:id`, AuthMiddleware, this.controller.remove);
  }
}
