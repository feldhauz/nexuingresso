import Link from "next/link";
import { followAction } from "@/actions/producer";
import type { ProducerProfile } from "@/lib/producer";
import { ActionForm, SubmitButton } from "./ActionForm";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function ProducerAvatar({ name, className = "size-12 text-xl" }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-brand font-display font-bold text-on-brand ${className}`}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function ProducerCounts({ profile }: { profile: ProducerProfile }) {
  return (
    <span className="text-sm text-muted">
      {plural(profile.followers, "seguidor", "seguidores")} · {plural(profile.events, "evento", "eventos")}
    </span>
  );
}

/** `back` é para onde voltar depois do login, quando quem clica ainda não entrou. */
export function FollowButton({ profile, back }: { profile: ProducerProfile; back: string }) {
  return (
    <ActionForm action={followAction}>
      <input type="hidden" name="producerId" value={profile.id} />
      <input type="hidden" name="back" value={back} />
      <SubmitButton className={profile.following ? "btn-quiet h-11 px-5" : "btn h-11 px-5"}>
        {profile.following ? "Seguindo" : "Seguir"}
      </SubmitButton>
    </ActionForm>
  );
}

/** Cartão "Organizado por" da página do evento. */
export function OrganizerCard({ profile, back }: { profile: ProducerProfile; back: string }) {
  return (
    <div className="card flex items-center justify-between gap-3 p-4">
      <Link href={`/p/${profile.slug}`} className="group flex min-w-0 items-center gap-3">
        <ProducerAvatar name={profile.name} />
        <span className="min-w-0">
          <span className="block truncate font-display text-lg font-semibold text-ink group-hover:underline">
            {profile.name}
          </span>
          <ProducerCounts profile={profile} />
        </span>
      </Link>
      <FollowButton profile={profile} back={back} />
    </div>
  );
}

export function MoodTags({ moods }: { moods: string[] }) {
  if (moods.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Estilos">
      {moods.map((mood) => (
        <li key={mood} className="rounded-full border border-line px-3 py-1 text-xs font-semibold tracking-wide text-ink-2 uppercase">
          {mood}
        </li>
      ))}
    </ul>
  );
}
