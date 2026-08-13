export type SignUpInput = {
  email: string;
  password: string;
  displayName: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type VerifyCodePurpose = 'signup' | 'recovery';

export type VerifyCodeInput = {
  email: string;
  token: string;
  purpose: VerifyCodePurpose;
};
