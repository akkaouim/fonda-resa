import { MapPin, Tag, Calendar, Euro, Hash, Image as ImageIcon } from 'lucide-react';

const ETAT_LABELS: Record<string, { label: string; color: string }> = {
  bon: { label: 'Bon', color: 'bg-green-100 text-green-800' },
  usage: { label: 'Usage', color: 'bg-yellow-100 text-yellow-800' },
  a_reparer: { label: 'A reparer', color: 'bg-orange-100 text-orange-800' },
  hors_service: { label: 'Hors service', color: 'bg-red-100 text-red-800' },
};

const PERIMETRE_LABELS: Record<string, { label: string; desc: string; color: string }> = {
  libre: { label: 'Libre', desc: 'Peut sortir du site', color: 'bg-green-100 text-green-800' },
  sur_le_site: { label: 'Sur le site', desc: 'Reste dans l\'enceinte de l\'Esviere', color: 'bg-blue-100 text-blue-800' },
  sur_place: { label: 'Sur place', desc: 'Ne quitte pas sa salle', color: 'bg-orange-100 text-orange-800' },
};

interface Props {
  item: any;
}

function Field({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ElementType }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
      <div>
        <span className="text-muted-foreground">{label} : </span>
        <span>{value}</span>
      </div>
    </div>
  );
}

export default function ItemDetail({ item }: Props) {
  const etat = ETAT_LABELS[item.etat];
  const perimetre = PERIMETRE_LABELS[item.perimetreUtilisation];
  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
      {/* Photo */}
      <div className="flex items-start justify-center sm:w-40">
        {item.photoUrl ? (
          <img src={item.photoUrl} alt={item.nom} className="max-h-40 rounded-md border border-border object-contain" />
        ) : (
          <div className="flex h-32 w-32 items-center justify-center rounded-md border border-dashed border-border bg-muted/50">
            <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="space-y-3">
        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold">{item.nom}</h3>
          {item.description && <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${etat?.color}`}>
            {etat?.label || item.etat}
          </span>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${perimetre?.color}`}>
            {perimetre?.label}
          </span>
          {item.typeItem === 'consommable' && (
            <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
              Consommable
            </span>
          )}
        </div>

        {/* Info grid */}
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Categorie" icon={Tag}
            value={item.categorie ? `${item.categorie.nom}${item.sousCategorie ? ` / ${item.sousCategorie.nom}` : ''}` : null} />
          <Field label="Stock" value={
            <span className="font-medium">
              {item.quantiteStock} unite(s)
              {((item.quantiteAReparer || 0) > 0 || (item.quantiteHorsService || 0) > 0) && (
                <span className="ml-1 font-normal text-muted-foreground">
                  ({item.quantiteStock - (item.quantiteAReparer || 0) - (item.quantiteHorsService || 0)} disponible{item.quantiteStock - (item.quantiteAReparer || 0) - (item.quantiteHorsService || 0) > 1 ? 's' : ''}
                  {(item.quantiteAReparer || 0) > 0 && <span className="text-orange-600">, {item.quantiteAReparer} a reparer</span>}
                  {(item.quantiteHorsService || 0) > 0 && <span className="text-red-600">, {item.quantiteHorsService} hors service</span>}
                  )
                </span>
              )}
            </span>
          } />
          <Field label="Localisation" icon={MapPin} value={item.localisation?.nom} />
          <Field label="Perimetre" value={perimetre?.desc} />
          <Field label="Marquage" icon={Hash} value={item.marquage} />
          <Field label="Date d'acquisition" icon={Calendar} value={item.dateAcquisition ? formatDate(item.dateAcquisition) : null} />
          <Field label="Valeur estimee" icon={Euro} value={item.valeurEstimee ? `${Number(item.valeurEstimee).toFixed(2)} €` : null} />
        </div>

        {/* Commentaire etat */}
        {item.commentaireEtat && (
          <div className="rounded-md bg-yellow-50 px-3 py-2 text-sm">
            <span className="font-medium text-yellow-800">Remarque : </span>
            <span className="text-yellow-700">{item.commentaireEtat}</span>
          </div>
        )}

        {/* Notes */}
        {item.notes && (
          <div className="text-sm">
            <span className="text-muted-foreground">Notes : </span>
            {item.notes}
          </div>
        )}
      </div>
    </div>
  );
}
