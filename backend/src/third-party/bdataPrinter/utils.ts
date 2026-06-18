import { SIO_EVENTS } from "@/third-party/bdataSocket/sioConstants";
import { WebSocketService } from "@/third-party/bdataSocket";

export const print = (data: any, eventId: string) => {
    const socketService = WebSocketService.getInstance();

    socketService.sendSocketEvent({
        event: SIO_EVENTS.REGISTER_HARDWARES,
        eventId,
        type: 'PRINT',
        data,
        timestamp: new Date()
    });
}