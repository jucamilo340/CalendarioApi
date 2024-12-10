import { Router } from "express";
import { GrupoController } from "../../modules/EventCalendar/useCases/Grupo";
import { AsignacionController } from "../../modules/EventCalendar/useCases/Asignacion";

const eventCalendarRoutes = Router();

const grupoController = new GrupoController();
const asignacionController = new AsignacionController();
eventCalendarRoutes.post("/", grupoController.create);
eventCalendarRoutes.get("/all", grupoController.getAll);
//eventCalendarRoutes.get("/:id", grupoController.get);
eventCalendarRoutes.put("/", grupoController.update);
eventCalendarRoutes.delete("/:id", grupoController.delete);
eventCalendarRoutes.get("/asignaciones/:id", grupoController.obtenerAsignacionesPorGrupo);
eventCalendarRoutes.put("/asignaciones", asignacionController.update);


export default eventCalendarRoutes;
