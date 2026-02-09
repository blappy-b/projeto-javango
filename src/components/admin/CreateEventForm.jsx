"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createEventAction } from "@/actions/events";
import {
  Loader2,
  Plus,
  Trash2,
  Calendar,
  MapPin,
  DollarSign,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { updateEventAction } from "@/actions/events";

// Schema do Front (Espelho do Back)
const formSchema = z.object({
  title: z.string().min(3, "Título obrigatório"),
  description: z.string().optional(),
  image_url: z.string().url("URL de imagem inválida").optional().or(z.literal("")),
  location: z.string().min(3, "Local obrigatório"),
  start_date: z.string().min(1, "Data de início obrigatória"),
  end_date: z.string().min(1, "Data de fim obrigatória"),
  batches: z.array(
    z.object({
      dbId: z.string().optional(),
      name: z.string().min(1, "Nome do lote"),
      price: z.coerce.number().min(0),
      quantity: z.coerce.number().min(1),
      quantity_sold: z.coerce.number().optional().default(0), // ✅ NOVO
      fee_percent: z.coerce.number().min(0),
    })
  ),
});

export default function CreateEventForm({ initialData = null }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const router = useRouter();

  const isEditMode = !!initialData;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: initialData
      ? {
          title: initialData.title,
          description: initialData.description || "",
          image_url: initialData.image_url || "",
          location: initialData.location,
          start_date: new Date(initialData.start_date)
            .toISOString()
            .slice(0, 16),
          end_date: new Date(initialData.end_date).toISOString().slice(0, 16),
          batches: initialData.ticket_batches.map((b) => ({
            dbId: b.id,
            name: b.name,
            price: b.price_cents / 100,
            quantity: b.total_quantity,
            quantity_sold: b.sold_quantity,
            fee_percent: b.service_fee_percent,
          })),
        }
      : {
          // Valores padrão para criar novo
          image_url: "",
          batches: [
            {
              name: "Ingresso Padrão",
              price: 0,
              quantity: 50,
              fee_percent: 10,
            },
          ],
        },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "batches",
  });

  // Função disparada no Submit
  const onSubmit = async (data) => {
    setIsSubmitting(true);

    try {
      // Prepara o FormData (Igual para Create e Update)
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("description", data.description || "");
      formData.append("location", data.location);
      formData.append("image_url", data.image_url || "");
      if (selectedImageFile) {
        formData.append("image_file", selectedImageFile);
      }
      formData.append("start_date", data.start_date);
      formData.append("end_date", data.end_date);

      // Serializa os lotes.
      // IMPORTANTE: Se for edição, o react-hook-form manteve os IDs nos objetos (se você usou o register correto),
      // então o backend saberá qual lote é novo e qual é antigo.
      formData.append("batches", JSON.stringify(data.batches));

      let result;

      // DECISÃO: Criar ou Editar?
      if (initialData) {
        // MODO EDIÇÃO: Passamos o ID do evento existente
        result = await updateEventAction(initialData.id, formData);
      } else {
        // MODO CRIAÇÃO: null como primeiro argumento (prevState)
        result = await createEventAction(null, formData);
      }

      // Tratamento de Resposta Unificado
      if (result?.error) {
        alert(result.error);
        setIsSubmitting(false); // Só destrava o botão se der erro
      } else {
        const mensagem = initialData
          ? "Evento atualizado!"
          : "Evento criado com sucesso!";

        alert(mensagem);
        router.refresh(); // Garante que a listagem pegue os dados novos
        router.push("/admin/events");
      }
    } catch (error) {
      console.error(error);
      alert("Ocorreu um erro inesperado. Tente novamente.");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-4xl">
      {/* Seção 1: Detalhes do Evento */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Calendar className="text-red-primary" size={20} />
          {isEditMode ? "Editar Evento" : "Criar Novo Evento"}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Título do Evento
            </label>
            <input
              {...register("title")}
              className="mt-1 w-full p-2 border rounded-md"
              placeholder="Ex: Recital de Inverno"
            />
            {errors.title && (
              <span className="text-red-500 text-xs">
                {errors.title.message}
              </span>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Descrição
            </label>
            <textarea
              {...register("description")}
              rows={3}
              className="mt-1 w-full p-2 border rounded-md"
            />
          </div>


          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              URL da Imagem de Capa
            </label>
            <input
              {...register("image_url")}
              className="mt-1 w-full p-2 border rounded-md"
              placeholder="https://..."
            />
            {errors.image_url && (
              <span className="text-red-500 text-xs">
                {errors.image_url.message}
              </span>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Ou envie uma imagem local
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(event) =>
                setSelectedImageFile(event.target.files?.[0] || null)
              }
              className="mt-1 w-full p-2 border rounded-md bg-white"
            />
            <p className="text-xs text-gray-500 mt-1">
              Se enviar arquivo local, ele terá prioridade sobre a URL.
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Local
            </label>
            <div className="flex items-center gap-2 border rounded-md px-2 bg-white">
              <MapPin size={18} className="text-gray-400" />
              <input
                {...register("location")}
                className="w-full p-2 outline-none"
                placeholder="Ex: Teatro Municipal"
              />
            </div>
            {errors.location && (
              <span className="text-red-500 text-xs">
                {errors.location.message}
              </span>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Início
            </label>
            <input
              type="datetime-local"
              {...register("start_date")}
              className="mt-1 w-full p-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Fim
            </label>
            <input
              type="datetime-local"
              {...register("end_date")}
              className="mt-1 w-full p-2 border rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Seção 2: Ingressos */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        {/* Header ... */}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-800">Ingressos</h3>

            <button
              type="button"
              onClick={() =>
                append({
                  dbId: undefined,
                  name: "",
                  price: 0,
                  quantity: 1,
                  fee_percent: 10,
                  quantity_sold: 0,
                })
              }
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline"
            >
              <Plus size={16} /> Adicionar lote
            </button>
          </div>

          {fields.map((field, index) => {
            const isExistingBatch = !!field.dbId;
            const sold = Number(field.quantity_sold ?? 0);
            const canDelete = !isExistingBatch || sold === 0;

            return (
              <div
                key={field.id}
                className={`flex flex-col md:flex-row gap-4 p-4 rounded-lg border relative group ${
                  isExistingBatch
                    ? "bg-gray-100 border-gray-200"
                    : "bg-white border-blue-100"
                }`}
              >
                {/* Input oculto do ID do banco */}
                <input type="hidden" {...register(`batches.${index}.dbId`)} />

                <div className="flex-1">
                  <label className="text-xs text-gray-500 font-medium">
                    Nome
                  </label>
                  <input
                    {...register(`batches.${index}.name`)}
                    readOnly={isExistingBatch}
                    className={`w-full p-2 border rounded-md text-sm ${
                      isExistingBatch
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : ""
                    }`}
                  />
                </div>

                <div className="w-16">
                  <label className="text-xs text-gray-500 font-medium">
                    Preço
                  </label>
                  <input
                    type="number"
                    {...register(`batches.${index}.price`)}
                    readOnly={isExistingBatch}
                    className={`w-full p-2 border rounded-md text-sm ${
                      isExistingBatch
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : ""
                    }`}
                  />
                </div>

                <div className="w-16">
                  <label className="text-xs text-gray-500 font-medium">
                    Qtd.
                  </label>
                  <input
                    type="number"
                    {...register(`batches.${index}.quantity`)}
                    readOnly={isExistingBatch}
                    className={`w-full p-2 border rounded-md text-sm ${
                      isExistingBatch
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : ""
                    }`}
                  />
                </div>

                {isExistingBatch && (
                  <div className="w-24">
                    <label className="text-xs text-gray-500 font-medium">
                      Qtd. Vendida
                    </label>
                    <input
                      type="number"
                      {...register(`batches.${index}.quantity_sold`)}
                      readOnly={isExistingBatch}
                      className={`w-full p-2 border rounded-md text-sm ${
                        isExistingBatch
                          ? "bg-gray-200 text-green-500 opacity-90 cursor-not-allowed"
                          : ""
                      }`}
                    />
                  </div>
                )}

                <div className="w-16">
                  <label className="text-xs text-gray-500 font-medium">
                    Taxa (%)
                  </label>
                  <input
                    type="number"
                    {...register(`batches.${index}.fee_percent`)}
                    readOnly={isExistingBatch}
                    className={`w-full p-2 border rounded-md text-sm ${
                      isExistingBatch
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : ""
                    }`}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={!canDelete}
                  className="md:mt-5 text-gray-400 hover:text-red-500 transition disabled:text-gray-300 disabled:hover:text-gray-300 disabled:cursor-not-allowed"
                  title={
                    isExistingBatch
                      ? "Excluir lote (apenas se sem vendas)"
                      : "Remover linha"
                  }
                >
                  <Trash2 size={18} />
                </button>

                {isExistingBatch && (
                  <div className="absolute -top-2 -right-2 bg-gray-200 text-gray-600 text-[10px] px-2 py-1 rounded-full font-bold">
                    Registrado
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-red-primary text-white px-8 py-3 rounded-lg font-bold hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" />
              <span>{isEditMode ? "Salvando..." : "Publicando..."}</span>
            </>
          ) : (
            <span>{isEditMode ? "Salvar Alterações" : "Publicar Evento"}</span>
          )}
        </button>
      </div>
    </form>
  );
}
