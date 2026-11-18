import { MODULE_ROUTES } from "../shared/constants";
import type { AppModule } from "../shared/constants";

export default function LeaderPermissions({ value, onChange }: {
  value: AppModule[];
  onChange: (modules: AppModule[]) => void;
}) {
  return (
    <fieldset className="leader-permissions">
      <legend>Páginas del Líder</legend>
      <div className="leader-permissions-options">
        {(Object.keys(MODULE_ROUTES) as AppModule[]).map(module => (
          <label key={module}>
            <input type="checkbox" checked={value.includes(module)} onChange={event => {
              onChange(event.target.checked ? [...value, module] : value.filter(item => item !== module));
            }} />
            {MODULE_ROUTES[module][1]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
