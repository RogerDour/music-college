// client/src/pages/MaterialsListWrapper.jsx
import { useParams } from "react-router-dom";
import MaterialsList from "./MaterialsList";

export default function MaterialsListWrapper() {
  const { courseId } = useParams();
  return <MaterialsList courseId={courseId} />;
}
