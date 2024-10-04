import { Router } from "express";
import { PlanController } from "../../modules/EventCalendar/useCases/Plan";

const eventCalendarRoutes = Router();

const planController = new PlanController();
eventCalendarRoutes.post("/", planController.create);
eventCalendarRoutes.get("/all", planController.getAll);
// eventCalendarRoutes.get("/:id", planController.getById);
eventCalendarRoutes.put("/", planController.update);
eventCalendarRoutes.delete("/:id", planController.delete);

export default eventCalendarRoutes;
