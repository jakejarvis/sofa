import { createFormHook } from "@tanstack/react-form";

import { fieldContext, formContext } from "./context";
import { CheckboxField, SubmitButton, SwitchField, TextareaField, TextField } from "./fields";

const { useAppForm, withForm } = createFormHook({
  fieldComponents: {
    TextField,
    TextareaField,
    CheckboxField,
    SwitchField,
  },
  formComponents: {
    SubmitButton,
  },
  fieldContext,
  formContext,
});

export { useAppForm, withForm };
