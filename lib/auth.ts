import { supabase, createServerClient } from "./supabase"
import { getClientApi } from "@/lib/portal"

export interface User {
  id: string
  email: string
  full_name: string
  phone?: string
  cli_id?: string
}

export async function signUp(email: string, password: string, fullName: string, session:any): Promise<User> {
  if (session) {
    const {data, error} = await supabase.auth.updateUser({
      password,
      data: {
        cli_id: "",
      },
    })
    if (error) throw error
    
    // After successful Supabase Auth signup, insert into our public.users table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .insert([
        {
          id: data.user!.id, // Use the ID from Supabase Auth
          email: data.user!.email!,
          full_name: fullName,
        },
      ])
      .select()
      .single()

    if (userError) throw userError

    return userData
  }else{
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          cli_id : ''
        },
      },
    })

    if (error) throw error

    // After successful Supabase Auth signup, insert into our public.users table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .insert([
        {
          id: data.user!.id, // Use the ID from Supabase Auth
          email: data.user!.email!,
          full_name: fullName,
        },
      ])
      .select()
      .single()

    if (userError) throw userError

    return userData
  }
}


export async function signUpOrUpdate(email: string, password: string, fullName: string, session: any): Promise<User> {
  if (session) {
    // Solo actualizar password en Auth
    const { data, error } = await supabase.auth.updateUser({
       password,
       data: { full_name: fullName }
       });
    if (error) throw error;

    // Actualizar nombre en tabla users donde coincida email
    const { data: userData, error: userError } = await supabase
      .from("users")
      .update({ full_name: fullName, id:data.user!.id})
      .eq("email", data.user!.email)
      .select()
      .single();

    if (userError) throw userError;

    return userData;
  } else {
    // Crear nuevo usuario en Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (error) throw error;

    // Insertar nuevo usuario en tabla users
    const { data: userData, error: userError } = await supabase
      .from("users")
      .insert([
        {
          id: data.user!.id,
          email: data.user!.email!,
          full_name: fullName,
        },
      ])
      .select()
      .single();

    if (userError) throw userError;

    return userData;
  }
}


export async function signIn2(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  console.log(data)

  if (data?.user?.user_metadata?.cli_id ){
    console.log("borrando cli!")
    const api_res = await getClientApi()
    const {data, error} = await supabase.auth.updateUser({
      data: {
        cli_id: api_res.clientApiKey,
      },
    })
    if (error) throw error
    return data
  }
  return data
}


export async function signIn(email: string, password: string) {
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) throw signInError;
  console.log(signInData);

  if (!signInData?.user?.user_metadata?.cli_id) {
    console.log("Agregando cli_id...");
    const api_res = await getClientApi();
    const { data: updateData, error: updateError } = await supabase.auth.updateUser({
      data: {
        cli_id: api_res.clientApiKey,
      },
    });
    if (updateError) throw updateError;
    return updateData;
  }

  return signInData;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser(): Promise<User | null> {
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) return null
  const cli_id = authUser?.user_metadata?.cli_id;

  // Fetch user details from our public.users table
  const { data, error } = await supabase.from("users").select("*").eq("id", authUser.id).single()

  if (error) {
    console.error("Error fetching user from public.users:", error)
    return null
  }
  data.cli_id = cli_id
  return data
}

export async function checkUserExistsByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabase.from("users").select("*").eq("email", email).single()
  if (error && error.code !== "PGRST116") {
    // PGRST116 means no rows found, which is expected for unregistered users
    throw error
  }
  return data
}

export async function inviteUserForTransaction(email: string, transactionId: string) {
  const serverSupabase = createServerClient()
  const { data, error } = await serverSupabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/signup?transactionId=${transactionId}&email=${email}`,
  })

  if (error) throw error
  return data
}
