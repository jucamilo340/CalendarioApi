import { Router } from "express";
import { EventCalendarController } from "../../modules/EventCalendar/useCases/EventCalendar";

const eventCalendarRoutes = Router();

const eventCalendarController = new EventCalendarController();
eventCalendarRoutes.post("/", eventCalendarController.create);
eventCalendarRoutes.get("/all", eventCalendarController.getAll);
eventCalendarRoutes.get("/:id", eventCalendarController.getAll);
eventCalendarRoutes.put("/", eventCalendarController.update);
eventCalendarRoutes.delete("/:id", eventCalendarController.delete);

export default eventCalendarRoutes;
