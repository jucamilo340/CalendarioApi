// @ts-nocheck
import { Router } from "express";
import { EventCalendarController } from "../../modules/EventCalendar/useCases/EventCalendar";

const eventCalendarRoutes = Router();

const eventCalendarController = new EventCalendarController();
eventCalendarRoutes.post("/", eventCalendarController.create);
eventCalendarRoutes.post("/generar/:id", eventCalendarController.generarHorario);
eventCalendarRoutes.get("/all", eventCalendarController.getAll);
eventCalendarRoutes.get("/:id", eventCalendarController.getAll);
eventCalendarRoutes.put("/", eventCalendarController.update);
eventCalendarRoutes.put("/date", eventCalendarController.updateDate);
eventCalendarRoutes.delete("/:id", eventCalendarController.delete);
eventCalendarRoutes.delete("/all/:id", eventCalendarController.deleteAll);

export default eventCalendarRoutes;
