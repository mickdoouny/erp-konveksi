export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-[400px]">
        <h1 className="text-3xl font-bold mb-6 text-center">
          ERP Konveksi
        </h1>

        <input
          className="border w-full p-3 rounded-lg mb-4"
          placeholder="Username"
        />

        <input
          className="border w-full p-3 rounded-lg mb-4"
          type="password"
          placeholder="Password"
        />

        <button className="bg-black text-white w-full p-3 rounded-lg">
          Login
        </button>
      </div>
    </div>
  )
}