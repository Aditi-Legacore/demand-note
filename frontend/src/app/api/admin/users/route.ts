import { prisma } from "@/lib/prisma";
import { hash } from "bcrypt";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";


export async function POST(req: Request) {
  try {
    // get logged-in user session
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { email, password, roles } = await req.json();

    const allowedRoles = ["admin", "Legacore User", "Customer", "App admin"];

    // Validate input
    if (!email || !password || !roles || !Array.isArray(roles) || roles.length === 0) {
      return NextResponse.json(
        { error: "Email, password, and at least one role are required" },
        { status: 400 }
      );
    }

    // Validate each role
    const invalidRoles = roles.filter(role => !allowedRoles.includes(role));
    if (invalidRoles.length > 0) {
      return NextResponse.json(
        { error: `Invalid roles: ${invalidRoles.join(', ')}. Allowed roles: Super Admin, App Admin, Legacore User, Customer` },
        { status: 400 }
      );
    }

    // check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(password, 10);

    // create user with roles array
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        roles: roles,
        createdById: session.user.id,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Update the GET method to handle roles properly
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const filter = url.searchParams.get('filter');
    const includeDeleted = url.searchParams.get('includeDeleted') === 'true';

    const where: {
      isDeletedUser?: boolean;
    } = {};

    // If includeDeleted is true, don't filter by isDeletedUser at all
    if (!includeDeleted) {
      where.isDeletedUser = filter === 'deleted';
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        roles: true,
        password: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        firstName: true,
        requestPassword: true,
        isDeletedUser: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Fetch users error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// export async function GET(req: Request) {
//   try {
//     const session = await getServerSession(authOptions);

//     if (!session || !session.user?.id) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const url = new URL(req.url);
//     const filter = url.searchParams.get('filter');
//     const role = url.searchParams.get('role'); // Single role filter
//     const roles = url.searchParams.get('roles'); // Comma-separated roles for exact match
//     const hasRole = url.searchParams.get('hasRole'); // Check if user has this role (among others)
//     const roleCount = url.searchParams.get('roleCount'); // Filter by number of roles

//     let where: {
//       isDeletedUser: boolean;
//       roles?: any;
//     } = {
//       isDeletedUser: false,
//     };

//     if (filter === 'deleted') {
//       where = {
//         isDeletedUser: true,
//       };
//     }

//     // Filter by exact role match (single role)
//     if (role) {
//       where.roles = {
//         equals: [role]
//       };
//     }

//     // Filter by exact multiple roles match (comma-separated)
//     if (roles) {
//       const rolesArray = roles.split(',').map(r => r.trim());
//       where.roles = {
//         equals: rolesArray
//       };
//     }

//     // Filter by "has this role" (user has this role, possibly with others)
//     if (hasRole) {
//       where.roles = {
//         has: hasRole
//       };
//     }

//     const users = await prisma.user.findMany({
//       where,
//       select: {
//         id: true,
//         email: true,
//         roles: true,
//         password: true,
//         createdAt: true,
//         updatedAt: true,
//         status: true,
//         firstName: true,
//         requestPassword: true,
//         isDeletedUser: true,
//       },
//       orderBy: {
//         createdAt: "desc",
//       },
//     });

//     // Additional filtering that might be complex in Prisma
//     let filteredUsers = users;

//     // Filter by number of roles
//     if (roleCount) {
//       const count = parseInt(roleCount);
//       filteredUsers = filteredUsers.filter(user => user.roles.length === count);
//     }

//     return NextResponse.json({ users: filteredUsers });
//   } catch (error) {
//     console.error("Fetch users error:", error);
//     return NextResponse.json(
//       { error: "Internal Server Error" },
//       { status: 500 }
//     );
//   }
// }

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Revive user by setting isDeletedUser to false
    await prisma.user.update({
      where: { id: userId },
      data: { isDeletedUser: false, forcePasswordReset: false, requestPassword: false },
    });

    return NextResponse.json({ message: "User revived successfully" });
  } catch (error) {
    console.error("Revive user error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Prevent deleting own account
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    // Soft delete user by setting isDeletedUser to true and status to false
    await prisma.user.update({
      where: { id: userId },
      data: { isDeletedUser: true, status: false, forcePasswordReset: false },
    });

    return NextResponse.json({ message: "User marked as deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Add PUT method for updating users
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id, email, password, roles } = await req.json();

    const allowedRoles = ["admin", "Legacore User", "Customer", "App admin"];

    // Validate input
    if (!id || !email || !roles || !Array.isArray(roles) || roles.length === 0) {
      return NextResponse.json(
        { error: "ID, email, and at least one role are required" },
        { status: 400 }
      );
    }

    // Validate each role
    const invalidRoles = roles.filter(role => !allowedRoles.includes(role));
    if (invalidRoles.length > 0) {
      return NextResponse.json(
        { error: `Invalid roles: ${invalidRoles.join(', ')}. Allowed roles: Super Admin, App Admin, Legacore User, Customer` },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if email is being changed and if it's already taken
    if (email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: {
      email?: string;
      roles?: string[];
      password?: string;
    } = {
      email,
      roles,
    };
    // Only update password if provided
    if (password) {
      updateData.password = await hash(password, 10);
    }

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        roles: true,
        status: true,
        firstName: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
