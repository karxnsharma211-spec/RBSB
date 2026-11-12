/* Prefill the enquiry with the service selected on the Services page. */
(() => {
  const params = new URLSearchParams(window.location.search);
  const service = params.get('service');
  if (!service) return;
  const field = document.getElementById('eventRequirements');
  if (!field) return;
  const safeService = service.trim().slice(0, 100);
  if (!safeService) return;
  const existing = field.value.trim();
  const line = `Service interested in: ${safeService}`;
  if (!existing.includes(line)) field.value = existing ? `${line}\n${existing}` : line;
})();
