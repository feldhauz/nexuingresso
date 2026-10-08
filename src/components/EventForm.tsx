import type { Event } from "@/lib/events";
import { POSTERS } from "@/lib/producer";
import { DEFAULT_TIME_ZONE, TIME_ZONES, utcToZonedInput } from "@/lib/time";

/** Campos do evento, usados na criação e na edição. Fica dentro de um ActionForm. */
export function EventFields({ event }: { event?: Event }) {
  const zone = event?.timeZone ?? DEFAULT_TIME_ZONE;
  const poster = event ? `${event.poster.bg}|${event.poster.fg}` : `${POSTERS[0].bg}|${POSTERS[0].fg}`;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {event && <input type="hidden" name="eventId" value={event.id} />}
      <div className="sm:col-span-2">
        <label htmlFor="title" className="label">
          Nome do evento
        </label>
        <input id="title" name="title" required minLength={3} maxLength={100} defaultValue={event?.title} className="field" />
      </div>
      {event && (
        <div className="sm:col-span-2">
          <label htmlFor="slug" className="label">
            Final do link
          </label>
          <div className="flex items-center rounded-xl border border-line bg-surface transition-colors duration-200 focus-within:border-brand">
            <span className="shrink-0 pl-4 text-muted">colajaingressos.com.br/e/</span>
            <input
              id="slug"
              name="slug"
              required
              minLength={3}
              maxLength={80}
              defaultValue={event.slug}
              autoCapitalize="none"
              spellCheck={false}
              className="h-12 w-full min-w-0 bg-transparent pr-4 text-base text-ink focus:outline-none"
            />
          </div>
          <p className="mt-1 text-sm text-muted">
            Só letras, números e hífen. Se você mudar, o link antigo continua levando para o evento.
          </p>
        </div>
      )}
      <div>
        <label htmlFor="startsAt" className="label">
          Início
        </label>
        <input
          id="startsAt"
          name="startsAt"
          type="datetime-local"
          required
          defaultValue={event && utcToZonedInput(event.startsAt, zone)}
          className="field"
        />
      </div>
      <div>
        <label htmlFor="endsAt" className="label">
          Término
        </label>
        <input
          id="endsAt"
          name="endsAt"
          type="datetime-local"
          required
          defaultValue={event && utcToZonedInput(event.endsAt, zone)}
          className="field"
        />
      </div>
      <div>
        <label htmlFor="venue" className="label">
          Local
        </label>
        <input id="venue" name="venue" required maxLength={100} defaultValue={event?.venue} placeholder="Nome da casa ou espaço" className="field" />
      </div>
      <div>
        <label htmlFor="city" className="label">
          Cidade
        </label>
        <input id="city" name="city" required maxLength={60} defaultValue={event?.city} className="field" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="address" className="label">
          Endereço
        </label>
        <input id="address" name="address" maxLength={160} defaultValue={event?.address} placeholder="Rua, número, bairro" className="field" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="description" className="label">
          Descrição
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={2000}
          defaultValue={event?.description}
          placeholder="Atrações, horário dos portões, o que pode levar"
          className="field h-auto py-3"
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="moods" className="label">
          Estilos, separados por vírgula (até 4, opcional)
        </label>
        <input id="moods" name="moods" maxLength={120} defaultValue={event?.moods.join(", ")} placeholder="funk, house" className="field" />
      </div>
      <div>
        <label htmlFor="timeZone" className="label">
          Horário de
        </label>
        <select id="timeZone" name="timeZone" defaultValue={zone} className="field">
          {TIME_ZONES.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="minAge" className="label">
          Idade mínima (0 para livre)
        </label>
        <input id="minAge" name="minAge" type="number" min={0} max={21} defaultValue={event?.minAge ?? 18} className="field" />
      </div>
      <div>
        <label htmlFor="maxPerCpf" className="label">
          Limite de ingressos por CPF
        </label>
        <input id="maxPerCpf" name="maxPerCpf" type="number" min={1} max={20} defaultValue={event?.maxPerCpf ?? 6} className="field" />
      </div>
      <fieldset>
        <legend className="label">Cor do cartaz</legend>
        <div className="flex flex-wrap gap-2">
          {POSTERS.map((option) => {
            const value = `${option.bg}|${option.fg}`;
            return (
              <label key={value} className="cursor-pointer">
                <input type="radio" name="poster" value={value} defaultChecked={value === poster} className="peer sr-only" />
                <span
                  className="flex size-11 items-center justify-center rounded-xl border-2 border-transparent text-sm font-bold peer-checked:border-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand"
                  style={{ backgroundColor: option.bg, color: option.fg }}
                  title={option.label}
                >
                  Aa<span className="sr-only"> {option.label}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <label className="flex min-h-11 cursor-pointer items-start gap-3 sm:col-span-2">
        <input type="checkbox" name="absorbFee" defaultChecked={event?.absorbFee} className="mt-1 size-5 accent-brand" />
        <span className="text-ink-2">
          O comprador paga exatamente o preço que eu definir.{" "}
          <span className="text-muted">
            Marcado, a taxa de serviço do contrato do produtor sai do seu repasse em vez de entrar no preço final.
          </span>
        </span>
      </label>
    </div>
  );
}
