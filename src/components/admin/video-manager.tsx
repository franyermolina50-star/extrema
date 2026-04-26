/* eslint-disable @next/next/no-img-element */
import { FormEvent, useMemo, useState } from "react";

import { MediaUploadField } from "@/components/admin/media-upload-field";
import { uploadAdminMedia } from "@/lib/backend-api";
import { toErrorMessage } from "@/lib/errors";
import { VideoContent } from "@/types/catalog";

import styles from "./admin.module.css";

interface VideoManagerProps {
  videos: VideoContent[];
  onAddVideo: (video: Omit<VideoContent, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  onUpdateVideo: (
    id: string,
    updates: Partial<Omit<VideoContent, "id" | "createdAt">>
  ) => Promise<void>;
  onRemoveVideo: (id: string) => Promise<void>;
}

interface VideoFormState {
  title: string;
  subtitle: string;
  videoUrl: string;
  coverUrl: string;
  order: number;
  active: boolean;
}

const initialVideoForm: VideoFormState = {
  title: "",
  subtitle: "",
  videoUrl: "",
  coverUrl: "",
  order: 1,
  active: true
};

export function VideoManager({
  videos,
  onAddVideo,
  onUpdateVideo,
  onRemoveVideo
}: VideoManagerProps) {
  const [form, setForm] = useState<VideoFormState>(initialVideoForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingMediaKey, setUploadingMediaKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const orderedVideos = useMemo(
    () => [...videos].sort((left, right) => left.order - right.order),
    [videos]
  );

  const uploadMedia = async (
    file: File,
    kind: "image" | "video",
    loadingKey: string
  ): Promise<string> => {
    setError(null);
    setUploadingMediaKey(loadingKey);
    try {
      return await uploadAdminMedia(file, kind);
    } catch (caughtError) {
      setError(toErrorMessage(caughtError, "No se pudo subir el archivo."));
      throw caughtError;
    } finally {
      setUploadingMediaKey((current) => (current === loadingKey ? null : current));
    }
  };

  const runUpdate = (id: string, updates: Partial<Omit<VideoContent, "id" | "createdAt">>) => {
    void onUpdateVideo(id, updates).catch((caughtError) => {
      setError(toErrorMessage(caughtError, "No se pudo actualizar el video."));
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim() || !form.videoUrl.trim() || !form.coverUrl.trim()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onAddVideo({
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        videoUrl: form.videoUrl.trim(),
        coverUrl: form.coverUrl.trim(),
        order: Number(form.order),
        active: form.active
      });

      setForm(initialVideoForm);
    } catch (caughtError) {
      setError(toErrorMessage(caughtError, "No se pudo crear el video."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeVideo = (id: string) => {
    setError(null);
    void onRemoveVideo(id).catch((caughtError) => {
      setError(toErrorMessage(caughtError, "No se pudo eliminar el video."));
    });
  };

  return (
    <div className={styles.panelStack}>
      <section className={styles.formCard}>
        <h2>Agregar video a portada</h2>
        <form className={styles.formGrid} onSubmit={(event) => void handleSubmit(event)}>
          <label>
            Titulo
            <input
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              required
              type="text"
              value={form.title}
            />
          </label>
          <label>
            Subtitulo
            <input
              onChange={(event) =>
                setForm((prev) => ({ ...prev, subtitle: event.target.value }))
              }
              type="text"
              value={form.subtitle}
            />
          </label>
          <div className={styles.fullWidth}>
            <MediaUploadField
              accept="video/*"
              helperText="Sube el video desde tu computador o arrastralo aqui."
              label="Archivo de video"
              onUpload={async (file) => {
                const uploadedUrl = await uploadMedia(file, "video", "video-form-video");
                setForm((prev) => ({ ...prev, videoUrl: uploadedUrl }));
              }}
              previewAlt={form.title || "Vista previa del video"}
              previewKind="video"
              previewUrl={form.videoUrl}
              uploading={uploadingMediaKey === "video-form-video"}
            />
          </div>
          <div className={styles.fullWidth}>
            <MediaUploadField
              accept="image/*"
              helperText="Agrega la imagen de portada del video."
              label="Portada del video"
              onUpload={async (file) => {
                const uploadedUrl = await uploadMedia(file, "image", "video-form-cover");
                setForm((prev) => ({ ...prev, coverUrl: uploadedUrl }));
              }}
              previewAlt={form.title || "Portada del video"}
              previewKind="image"
              previewUrl={form.coverUrl}
              uploading={uploadingMediaKey === "video-form-cover"}
            />
          </div>
          <label>
            Orden
            <input
              min={1}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, order: Number(event.target.value) }))
              }
              required
              type="number"
              value={form.order}
            />
          </label>
          <label className={styles.inlineCheck}>
            <input
              checked={form.active}
              onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
              type="checkbox"
            />
            Video activo al crear
          </label>
          <button className={styles.primaryButton} disabled={isSubmitting} type="submit">
            {isSubmitting ? "Guardando..." : "Guardar video"}
          </button>
        </form>
        {error ? <p className={styles.inlineError}>{error}</p> : null}
      </section>

      <section className={styles.listCard}>
        <h2>Videos configurados</h2>
        <div className={styles.videoList}>
          {orderedVideos.map((video) => (
            <article className={styles.videoEditor} key={video.id}>
              <MediaUploadField
                accept="image/*"
                compact
                helperText="Arrastra una portada nueva para reemplazarla."
                label="Portada actual"
                onUpload={async (file) => {
                  const uploadedUrl = await uploadMedia(
                    file,
                    "image",
                    `video-cover-${video.id}`
                  );
                  runUpdate(video.id, { coverUrl: uploadedUrl });
                }}
                previewAlt={video.title}
                previewKind="image"
                previewUrl={video.coverUrl}
                uploading={uploadingMediaKey === `video-cover-${video.id}`}
              />
              <div className={styles.videoEditorBody}>
                <label>
                  Titulo
                  <input
                    onChange={(event) =>
                      runUpdate(video.id, { title: event.target.value })
                    }
                    type="text"
                    value={video.title}
                  />
                </label>
                <label>
                  Subtitulo
                  <input
                    onChange={(event) =>
                      runUpdate(video.id, { subtitle: event.target.value })
                    }
                    type="text"
                    value={video.subtitle}
                  />
                </label>
                <div className={styles.fullWidth}>
                  <MediaUploadField
                    accept="video/*"
                    compact
                    helperText="Arrastra el archivo de video para reemplazarlo."
                    label="Archivo de video"
                    onUpload={async (file) => {
                      const uploadedUrl = await uploadMedia(
                        file,
                        "video",
                        `video-file-${video.id}`
                      );
                      runUpdate(video.id, { videoUrl: uploadedUrl });
                    }}
                    previewAlt={video.title}
                    previewKind="video"
                    previewUrl={video.videoUrl}
                    uploading={uploadingMediaKey === `video-file-${video.id}`}
                  />
                </div>
                <div className={styles.videoActions}>
                  <label>
                    Orden
                    <input
                      min={1}
                      onChange={(event) =>
                        runUpdate(video.id, { order: Number(event.target.value) })
                      }
                      type="number"
                      value={video.order}
                    />
                  </label>
                  <label className={styles.inlineCheck}>
                    <input
                      checked={video.active}
                      onChange={(event) =>
                        runUpdate(video.id, { active: event.target.checked })
                      }
                      type="checkbox"
                    />
                    Activo
                  </label>
                  <button
                    className={styles.dangerButton}
                    onClick={() => removeVideo(video.id)}
                    type="button"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
