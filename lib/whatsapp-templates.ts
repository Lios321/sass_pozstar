
type TemplateComponents = Array<any>

type TemplateDefinition = {
  name: string
  language: string
  build: (params: Record<string, any>) => TemplateComponents
}

  const TEMPLATES: Record<string, TemplateDefinition> = {
    confirmacao_servico: {
      name: "confirmacao_servico",
      language: "pt_BR",
      build: (params) => [
        {
          type: "body",
          parameters: [{ type: "text", text: String(params?.nome || "Cliente") }],
        },
      ],
    },
    equipamentos_pendentes_abertura: {
      name: "equipamentos_pendentes_abertura",
      language: "pt_BR",
      build: (params) => [
        {
          type: "body",
          parameters: [
            { type: "text", text: String(params?.nome || "Cliente") }, // {{1}}
            { type: "text", text: String(params?.equipamento || "equipamento") }, // {{2}}
            { type: "text", text: String(params?.quantidade || "0") }, // {{3}}
          ],
        },
      ],
    },
    aberto_os: {
      name: "aberto_os",
      language: "pt_BR",
      build: (params) => [
        {
          type: "body",
          parameters: [
            { type: "text", text: String(params?.nome || "Cliente") }, // {{1}}
            { type: "text", text: String(params?.equipamento || "") }, // {{2}}
          ],
        },
      ],
    },
    orcamento_conserto: {
      name: "orcamento_conserto",
      language: "pt_BR",
      build: (params) => [
        params?.documentId
          ? {
              type: "header",
              parameters: [
                {
                  type: "document",
                  document: {
                    id: String(params.documentId),
                    filename: String(params.documentFilename || "orcamento.pdf"),
                  },
                },
              ],
            }
          : undefined,
        {
          type: "body",
          parameters: [
            { type: "text", text: String(params?.nome || "Cliente") }, // {{1}}
            { type: "text", text: String(params?.ordem || "") }, // {{2}}
            { type: "text", text: String(params?.equipamento || "") }, // {{3}}
            { type: "text", text: String(params?.marcaModelo || "") }, // {{4}}
            { type: "text", text: String(params?.valor || "") }, // {{5}}
            { type: "text", text: String(params?.prazo || "") }, // {{6}}
          ],
        },
      ].filter(Boolean) as TemplateComponents,
    },
  }

export function getTemplate(key: string): TemplateDefinition | undefined {
  return TEMPLATES[key]
}

export function listTemplates(): Array<{ key: string; name: string; language: string }> {
  return Object.entries(TEMPLATES).map(([key, def]) => ({
    key,
    name: def.name,
    language: def.language,
  }))
}

export function buildTemplatePayload(key: string, params: Record<string, any>) {
  const def = getTemplate(key)
  if (!def) return undefined
  return {
    name: def.name,
    language: def.language,
    components: def.build(params),
  }
}
