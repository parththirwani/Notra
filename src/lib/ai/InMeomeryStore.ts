import { Message } from "@/types/chat";

export class InMeomeryStore {
    private static instance: InMeomeryStore;
    private store: Record<
        string,
        {
            messages: Message[];
            evictionTime: number;
        }
    >;
    private clock : NodeJS.Timer;
}
