import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { KitchenRecipe } from '@/lib/models';
import { requirePermission } from '@/lib/requireAuth';
import { safeRegex } from '@/lib/security';

export async function GET(request: NextRequest) {
  const { error } = await requirePermission(request, 'view_kitchen');
  if (error) return error;

  await connectDB();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const category = searchParams.get('category');

  const filter: Record<string, unknown> = { isActive: true };
  if (category) filter.category = category;
  if (search) {
    filter.$or = [
      { name: safeRegex(search) },
      { nameFr: safeRegex(search) },
    ];
  }

  const recipes = await KitchenRecipe.find(filter)
    .populate('ingredients.stockItem', 'name unit unitCost currentStock minStock')
    .sort({ name: 1 })
    .lean();

  return NextResponse.json({ recipes });
}

export async function POST(request: NextRequest) {
  const { error } = await requirePermission(request, 'manage_kitchen');
  if (error) return error;

  await connectDB();

  const body = await request.json();
  const { name, nameFr, category, servings, description, instructions, prepTime, cookTime, ingredients } = body;

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  if (!servings || Number(servings) < 1) {
    return NextResponse.json({ error: 'servings must be at least 1' }, { status: 400 });
  }

  const recipe = await KitchenRecipe.create({
    name: name.trim(),
    nameFr: nameFr?.trim() || '',
    category: category || 'other',
    servings: Number(servings),
    description: description || '',
    instructions: instructions || '',
    prepTime: Math.max(0, Number(prepTime) || 0),
    cookTime: Math.max(0, Number(cookTime) || 0),
    ingredients: (ingredients || []).map((ing: any) => ({
      stockItem: ing.stockItem,
      quantity: Math.max(0, Number(ing.quantity) || 0),
      unit: ing.unit || '',
    })),
  });

  const populated = await KitchenRecipe.findById(recipe._id)
    .populate('ingredients.stockItem', 'name unit unitCost currentStock minStock')
    .lean();

  return NextResponse.json({ recipe: populated }, { status: 201 });
}
