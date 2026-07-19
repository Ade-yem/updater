import { Module } from "@nestjs/common";
import { HealthControlller } from "./health.controller";

@Module({
    imports: [],
    controllers: [HealthControlller]
})

export class HealthModule {}