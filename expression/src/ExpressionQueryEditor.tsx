// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { MenuItem, Stack, TextField, Typography } from "@mui/material";
import type { OptionsEditorProps } from "@perses-dev/plugin-system";
import { produce } from "immer";
import type { ReactElement } from "react";
import { useState } from "react";

import type {
  ExpressionQuerySpec,
  ExpressionType,
} from "./expression-query-types";
import { EXPRESSION_TYPES } from "./expression-query-types";

type ExpressionQueryEditorProps = OptionsEditorProps<ExpressionQuerySpec>;

/**
 * A text field that keeps its own state and commits the value on blur or on Ctrl/Cmd+Enter,
 * so the queries are not executed on every keystroke.
 */
function CommitTextField(props: {
  label: string;
  value: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}): ReactElement {
  const { label, value, onCommit, placeholder, readOnly } = props;
  const [current, setCurrent] = useState(value);
  // Reset the local state when the value is changed from outside (adjusting state during render).
  const [previousValue, setPreviousValue] = useState(value);
  if (value !== previousValue) {
    setPreviousValue(value);
    setCurrent(value);
  }
  const commit = (): void => {
    if (current !== value) {
      onCommit(current);
    }
  };
  return (
    <TextField
      size="small"
      fullWidth
      multiline
      label={label}
      value={current}
      placeholder={placeholder}
      slotProps={{ input: { readOnly } }}
      onChange={(e) => setCurrent(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          commit();
        }
      }}
    />
  );
}

function MathEditor({
  value,
  onChange,
  isReadonly,
}: ExpressionQueryEditorProps): ReactElement {
  return (
    <Stack spacing={1}>
      <CommitTextField
        label="Expression"
        value={value.expression ?? ""}
        placeholder="$A / $B * 100"
        readOnly={isReadonly}
        onCommit={(expression) =>
          onChange(
            produce(value, (draft) => {
              draft.expression = expression;
            }),
          )
        }
      />
      <Typography variant="caption" color="text.secondary">
        Reference the other queries with $A, $B... (or their name, e.g. ${"{"}my
        query{"}"}). Operators: + - * / % ** == != &lt; &lt;= &gt; &gt;= && ||
        !. Functions: abs, ceil, floor, round, log, log10, exp, sqrt, is_null,
        is_nan, is_inf, is_number. Series are matched on their labels.
      </Typography>
    </Stack>
  );
}

export function ExpressionQueryEditor(
  props: ExpressionQueryEditorProps,
): ReactElement {
  const { value, onChange, isReadonly } = props;
  const type = value.type ?? "math";

  return (
    <Stack spacing={2} paddingBottom={1}>
      <TextField
        select
        size="small"
        label="Operation"
        value={type}
        disabled={isReadonly || EXPRESSION_TYPES.length < 2}
        helperText={EXPRESSION_TYPES.find((t) => t.value === type)?.description}
        onChange={(e) => onChange({ type: e.target.value as ExpressionType })}
      >
        {EXPRESSION_TYPES.map((t) => (
          <MenuItem key={t.value} value={t.value}>
            {t.label}
          </MenuItem>
        ))}
      </TextField>
      {type === "math" && <MathEditor {...props} />}
    </Stack>
  );
}
