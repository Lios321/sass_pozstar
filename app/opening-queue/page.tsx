import React from "react"

export const runtime = 'edge'

async function fetchItems() {
  const res = await fetch(`/api/opening-queue`, { cache: "no-store" })
  const data: any = await res.json().catch(() => ({ ok: false }))
  return data?.items || []
}

export default async function OpeningQueuePage() {
  const items = await fetchItems()
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Fila de abertura</h1>
      <table className="min-w-full text-sm border">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Posição</th>
            <th className="p-2 text-left">Cliente</th>
            <th className="p-2 text-left">Equipamento</th>
            <th className="p-2 text-left">Chegada</th>
            <th className="p-2 text-left">Ações</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it: any) => (
            <tr key={it.id} className="border-t">
              <td className="p-2">{Number(it.positionIndex) + 1}</td>
              <td className="p-2">{it.clientName}</td>
              <td className="p-2">{it.equipmentType}</td>
              <td className="p-2">{new Date(it.arrivalDate).toLocaleString()}</td>
              <td className="p-2">
                <form action={`/api/opening-queue/${it.id}/open`} method="post">
                  <button
                    className="px-3 py-1 rounded bg-green-600 text-white"
                    formAction={`/api/opening-queue/${it.id}/open`}
                    formMethod="patch"
                  >
                    Abrir
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
