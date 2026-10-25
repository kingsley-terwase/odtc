import { useState } from 'react';
import { IconButton, InputAdornment, TextField } from '@mui/material';
import VisibilityRounded from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRounded from '@mui/icons-material/VisibilityOffRounded';

export function PasswordField({ label = 'Password', autoComplete = 'current-password', ...p }) {
  const [show, setShow] = useState(false);
  return (
    <TextField
      label={label} type={show ? 'text' : 'password'} autoComplete={autoComplete} {...p}
      slotProps={{ input: { endAdornment: (
        <InputAdornment position="end">
          <IconButton aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow((s) => !s)} edge="end">{show ? <VisibilityOffRounded /> : <VisibilityRounded />}</IconButton>
        </InputAdornment>
      ) } }}
    />
  );
}

export const isEmail = (v) => /^\S+@\S+\.\S+$/.test(String(v).trim());
export const isNgPhone = (v) => /^(\+?234|0)\d{10}$/.test(String(v).replace(/[\s-]/g, ''));
