import { Mono } from './mono';

export interface FieldChange {
  field: string;
  before: string | null;
  after: string | null;
}

function Value({ value, sign }: { value: string | null; sign: '−' | '+' }) {
  return value === null || value === '' ? (
    <span className="text-ink-tertiary">(empty)</span>
  ) : (
    <>
      <span aria-hidden="true" className="mr-1.5 text-ink-tertiary select-none">
        {sign}
      </span>
      <Mono>{value}</Mono>
    </>
  );
}

/**
 * What an audit entry changed, field by field. Before and after are separate
 * columns with words and signs, so the difference never rests on red and green alone.
 */
export function AuditDiff({ changes, caption }: { changes: FieldChange[]; caption: string }) {
  return (
    <div className="overflow-clip rounded-lg border border-line">
      <table className="w-full table-fixed border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="bg-sunken text-label font-medium text-ink-secondary">
            <th scope="col" className="w-[30%] px-4 py-2.5 max-md:w-[26%] max-md:px-2">
              Field
            </th>
            <th scope="col" className="px-4 py-2.5">
              Before
            </th>
            <th scope="col" className="px-4 py-2.5">
              After
            </th>
          </tr>
        </thead>
        <tbody>
          {changes.map((change) => (
            <tr key={change.field} className="border-t border-line align-top">
              <th scope="row" className="px-4 py-2.5 text-body font-normal break-words text-ink max-md:px-2">
                {change.field}
              </th>
              <td className="bg-error-bg/50 px-4 py-2.5 text-body break-words">
                <Value value={change.before} sign="−" />
              </td>
              <td className="bg-success-bg/50 px-4 py-2.5 text-body break-words">
                <Value value={change.after} sign="+" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
