-- Allow an agency owner to update their own agency row.
-- Previously only a SELECT policy existed; UPDATE was silently rejected by Postgres
-- (0 rows affected, no error), causing drive_folder_id saves to appear to succeed but
-- never actually write to the database.
CREATE POLICY "Owner can update own agency"
  ON agencies
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
