import { Message } from "@/types/chat";
const EVICTION_TIME = 5 * 60 * 1000; // 5 minutes
export class InMemoryStore {
    private static instance: InMemoryStore;
    private store: Record<
        string,
        {
            messages: Message[];
            evictionTime: number;
        }
    >;
    private clock : NodeJS.Timeout;

    private constructor(){
        this.store = {},
        this.clock = setInterval(()=>{
            const now = Date.now();
            Object.entries(this.store).forEach(([key, value])=>{
                if(now>value.evictionTime){
                    console.log(`evicting key${key}`);
                    delete this.store[key]
                }
            })
        }, 60*1000)
    }

    public destroy(){
        clearInterval(this.clock);
    }

    static getInstance(){
        if(!InMemoryStore.instance){
            InMemoryStore.instance = new InMemoryStore();
        }
        return InMemoryStore.instance
    }

    add(conversationId: string, message: Message){
        if(!this.store[conversationId]){
            this.store[conversationId] = {
                messages: [],
                evictionTime: Date.now() + EVICTION_TIME
            }
        }
        this.store[conversationId].messages.push(message);
        this.store[conversationId].evictionTime = Date.now()+EVICTION_TIME;
    }

    get(conversationId: string): Message[]{
        return this.store[conversationId]?.messages ?? []
    }
}
