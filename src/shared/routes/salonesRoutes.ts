import { Router } from "express";
import { SalonController } from "../../modules/EventCalendar/useCases/Salon";

const eventCalendarRoutes = Router();

const salonController = new SalonController();
eventCalendarRoutes.post("/", salonController.create);
eventCalendarRoutes.get("/all", salonController.getAll);
eventCalendarRoutes.get("/:id", salonController.getById);
eventCalendarRoutes.put("/", salonController.update);
eventCalendarRoutes.delete("/:id", salonController.delete);

export default eventCalendarRoutes;
