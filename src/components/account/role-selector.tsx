import { GraduationCap, Presentation } from "lucide-react";

const options = [
  { value: "teacher", label: "Professor", description: "Crie aulas e oriente estudantes.", Icon: Presentation },
  { value: "student", label: "Aluno", description: "Participe de aulas e pratique desenho.", Icon: GraduationCap },
] as const;

export default function RoleSelector() {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-bold text-white/80">
        Como você pretende utilizar o Box?
      </legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map(({ value, label, description, Icon }) => (
          <label key={value} className="relative cursor-pointer">
            <input type="radio" name="role" value={value} required className="peer sr-only" />
            <span className="flex h-full min-h-36 flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/25 peer-checked:border-[#ff1152] peer-checked:bg-[#ff1152]/10 peer-focus-visible:ring-2 peer-focus-visible:ring-[#ff1152]">
              <Icon size={24} className="text-[#ff1152]" aria-hidden="true" />
              <span className="font-extrabold">{label}</span>
              <span className="text-xs font-medium leading-5 text-white/50">{description}</span>
            </span>
            <span aria-hidden="true" className="absolute right-3 top-3 h-4 w-4 rounded-full border border-white/25 peer-checked:border-[#ff1152] peer-checked:bg-[#ff1152] peer-checked:shadow-[inset_0_0_0_3px_#191016]" />
          </label>
        ))}
      </div>
      <p className="mt-2 text-xs leading-5 text-white/40">O tipo de conta é definido uma única vez.</p>
    </fieldset>
  );
}
