import { RegisterForm } from "@/components/forms/register-form";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-8">Create account</h1>
        <RegisterForm />
        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <a href="/login" className="text-gray-900 underline underline-offset-2 hover:text-gray-700">
            Sign in
          </a>
        </p>
      </div>
    </main>
  );
}
