
DROP POLICY "System insert notifications" ON public.notifications;
CREATE POLICY "Admin insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
