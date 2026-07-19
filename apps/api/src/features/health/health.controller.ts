import { Controller, Get } from "@nestjs/common";

@Controller('health')
export class HealthControlller {
    @Get('live')
    async LiveCheck() {
        return {
            status: "ok",
            timestamp: new Date()
        }
    }
}