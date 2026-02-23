import { useRoutes } from "react-router-dom";
import { routes } from "./routes.tsx";

export default function App() {
  return useRoutes(routes);
}
