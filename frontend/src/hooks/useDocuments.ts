import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface DbDocument {
  id: string;
  user_id: string;
  folder_id: string | null;
  title: string;
  type: "text" | "spreadsheet";
  content: any;
  created_at: string;
  updated_at: string;
}

export function useDocuments(folderId?: string | null) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DbDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (!user) return;
    let query = (supabase as any)
      .from("documents")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (folderId !== undefined) {
      if (folderId === null) {
        query = query.is("folder_id", null);
      } else {
        query = query.eq("folder_id", folderId);
      }
    }

    const { data } = await query;
    setDocuments((data || []) as DbDocument[]);
    setLoading(false);
  }, [user, folderId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const createDocument = useCallback(
    async (title: string, type: "text" | "spreadsheet", folder_id?: string | null) => {
      if (!user) return null;
      const defaultContent =
        type === "text"
          ? { html: "" }
          : { rows: Array.from({ length: 10 }, () => Array(5).fill("")) };

      const { data, error } = await (supabase as any)
        .from("documents")
        .insert({
          user_id: user.id,
          folder_id: folder_id || null,
          title,
          type,
          content: defaultContent,
        })
        .select()
        .single();

      if (error || !data) return null;
      const doc = data as DbDocument;
      setDocuments((prev) => [doc, ...prev]);
      return doc;
    },
    [user]
  );

  const updateDocument = useCallback(
    (id: string, updates: Partial<Pick<DbDocument, "title" | "content">>) => {
      if (!user) return;
      setDocuments((prev) =>
        prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
      );

      // Debounced save
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        await (supabase as any)
          .from("documents")
          .update(updates)
          .eq("id", id)
          .eq("user_id", user.id);
      }, 800);
    },
    [user]
  );

  const removeDocument = useCallback(
    async (id: string) => {
      if (!user) return;
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      await (supabase as any)
        .from("documents")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
    },
    [user]
  );

  /** Move document to a folder - optimistic update with rollback on error */
  const moveDocumentToFolder = useCallback(
    async (docId: string, targetFolderId: string | null): Promise<boolean> => {
      if (!user) return false;
      
      // Find the document to move
      const docToMove = documents.find(d => d.id === docId);
      if (!docToMove) return false;
      
      const previousFolderId = docToMove.folder_id;
      
      // Optimistic update - immediately remove from current list if moving to different folder
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      
      try {
        const { error } = await (supabase as any)
          .from("documents")
          .update({ folder_id: targetFolderId })
          .eq("id", docId)
          .eq("user_id", user.id);
        
        if (error) {
          // Rollback on error
          setDocuments((prev) => [docToMove, ...prev]);
          return false;
        }
        
        return true;
      } catch {
        // Rollback on error
        setDocuments((prev) => [docToMove, ...prev]);
        return false;
      }
    },
    [user, documents]
  );

  return { 
    documents, 
    loading, 
    createDocument, 
    updateDocument, 
    removeDocument, 
    moveDocumentToFolder,
    refetch: fetchDocuments 
  };
}
