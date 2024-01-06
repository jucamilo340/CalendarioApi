import { Router } from "express";
import { ProfesorController } from "../../modules/EventCalendar/useCases/Profesor";

const eventCalendarRoutes = Router();

const profesorController = new ProfesorController();
eventCalendarRoutes.post("/", profesorController.create);
eventCalendarRoutes.get("/all", profesorController.getAll);
eventCalendarRoutes.get("/:id", profesorController.getById);
eventCalendarRoutes.put("/", profesorController.update);
eventCalendarRoutes.delete("/:id", profesorController.delete);

export default eventCalendarRoutes;
