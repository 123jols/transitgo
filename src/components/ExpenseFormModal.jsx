import Modal from "./Modal";
import ExpenseForm from "./ExpenseForm";

export default function ExpenseFormModal({ title, initialValues, submitLabel, onSubmit, onClose }) {
  return (
    <Modal title={title} onClose={onClose}>
      <ExpenseForm
        initialValues={initialValues}
        submitLabel={submitLabel}
        onSubmit={onSubmit}
        onCancel={onClose}
      />
    </Modal>
  );
}
