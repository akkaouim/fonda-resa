import { useState, useRef } from 'react';
import { Upload, X, Check, AlertTriangle } from 'lucide-react';

interface Props {
  onImport: (rows: Record<string, any>[]) => Promise<any>;
  isLoading: boolean;
  result?: { created: number; errors: { row: number; message: string }[] } | null;
  onClose: () => void;
}

const FIELD_OPTIONS = [
  { value: '', label: '— Ignorer —' },
  { value: 'nom', label: 'Nom' },
  { value: 'description', label: 'Description' },
  { value: 'categorie', label: 'Categorie' },
  { value: 'localisation', label: 'Localisation' },
  { value: 'quantiteStock', label: 'Quantite' },
  { value: 'etat', label: 'Etat' },
  { value: 'commentaireEtat', label: 'Commentaire etat' },
  { value: 'marquage', label: 'Marquage' },
  { value: 'typeItem', label: 'Type (equipement/consommable)' },
  { value: 'perimetreUtilisation', label: 'Perimetre' },
  { value: 'notes', label: 'Notes' },
];

export default function ImportWizard({ onImport, isLoading, result, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rawData, setRawData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<number, string>>({});

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) return;

      const separator = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
      const parsed = lines.map((l) => l.split(separator).map((c) => c.trim().replace(/^"|"$/g, '')));
      const hdrs = parsed[0];
      setHeaders(hdrs);
      setRawData(parsed.slice(1));

      // Auto-map columns
      const autoMap: Record<number, string> = {};
      const lowerMap: Record<string, string> = {
        nom: 'nom', designation: 'nom', name: 'nom',
        description: 'description', desc: 'description',
        categorie: 'categorie', category: 'categorie', type: 'categorie',
        localisation: 'localisation', rangement: 'localisation', lieu: 'localisation', location: 'localisation',
        quantite: 'quantiteStock', qte: 'quantiteStock', qty: 'quantiteStock', stock: 'quantiteStock', 'quantite stock': 'quantiteStock',
        etat: 'etat', state: 'etat', condition: 'etat',
        marquage: 'marquage', couleur: 'marquage', repere: 'marquage', 'couleur repere': 'marquage',
        notes: 'notes', remarques: 'notes', commentaire: 'notes',
      };
      hdrs.forEach((h, i) => {
        const key = h.toLowerCase().trim();
        if (lowerMap[key]) autoMap[i] = lowerMap[key];
      });
      setMapping(autoMap);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    const rows = rawData.map((row) => {
      const obj: Record<string, any> = {};
      Object.entries(mapping).forEach(([colIdx, field]) => {
        if (field && row[Number(colIdx)]) {
          obj[field] = row[Number(colIdx)];
        }
      });
      return obj;
    }).filter((r) => r.nom);

    await onImport(rows);
  };

  return (
    <div className="mb-6 rounded-lg border border-border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Importer depuis Excel / CSV</h2>
        <button onClick={onClose}><X className="h-4 w-4" /></button>
      </div>

      {result ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-5 w-5 text-green-600" />
            <span className="font-medium">{result.created} items importes</span>
          </div>
          {result.errors.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-sm text-orange-600">
                <AlertTriangle className="h-4 w-4" />
                {result.errors.length} erreurs
              </div>
              <ul className="mt-1 max-h-32 overflow-y-auto text-xs text-muted-foreground">
                {result.errors.map((e, i) => (
                  <li key={i}>Ligne {e.row}: {e.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : headers.length === 0 ? (
        <div>
          <p className="mb-2 text-sm text-muted-foreground">
            Formats acceptes : .csv (separateur virgule, point-virgule ou tabulation).
            Exportez votre fichier Excel au format CSV.
          </p>
          <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" onChange={handleFile} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 rounded-md border border-dashed border-input px-4 py-3 text-sm hover:bg-muted"
          >
            <Upload className="h-4 w-4" />
            Choisir un fichier
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{rawData.length} lignes detectees</p>

          {/* Column mapping */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Correspondance des colonnes</p>
            {headers.map((h, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="w-40 truncate text-muted-foreground" title={h}>{h}</span>
                <span className="text-muted-foreground">→</span>
                <select
                  value={mapping[i] || ''}
                  onChange={(e) => setMapping({ ...mapping, [i]: e.target.value })}
                  className="rounded-md border border-input px-2 py-1 text-sm"
                >
                  {FIELD_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
            ))}
          </div>

          {/* Preview */}
          <div>
            <p className="mb-1 text-sm font-medium">Apercu (5 premieres lignes)</p>
            <div className="max-h-40 overflow-auto rounded border border-border text-xs">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    {headers.map((h, i) => mapping[i] ? (
                      <th key={i} className="px-2 py-1 text-left font-medium">{mapping[i]}</th>
                    ) : null)}
                  </tr>
                </thead>
                <tbody>
                  {rawData.slice(0, 5).map((row, ri) => (
                    <tr key={ri} className="border-t border-border">
                      {headers.map((_, ci) => mapping[ci] ? (
                        <td key={ci} className="px-2 py-1">{row[ci] || ''}</td>
                      ) : null)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button
            onClick={handleImport}
            disabled={isLoading || !Object.values(mapping).includes('nom')}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading ? 'Import en cours...' : `Importer ${rawData.length} items`}
          </button>
        </div>
      )}
    </div>
  );
}
