import { NextRequest, NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const referenceId = searchParams.get('referenceId');

  if (!referenceId) {
    return NextResponse.json({ error: "Reference ID required" }, { status: 400 });
  }

  try {
    // For embed, allow fetching draft without auth if referenceId exists
    const intake = await prisma.intakeInfo.findFirst({
      where: {
        referenceId: referenceId,
        isDraft: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    if (!intake) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    return NextResponse.json({ draft: intake });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch draft" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  const { referenceId, ...draftFields } = data;

  if (!referenceId) {
    return NextResponse.json({ error: "Reference ID required" }, { status: 400 });
  }

  try {
    // For embed, allow draft saving without auth
    const existingIntake = await prisma.intakeInfo.findFirst({
      where: { referenceId: referenceId },
    });

    // Define allowed fields based on Prisma schema
    const allowedFields = [
      'clientName', 'gender', 'phoneNumber', 'email', 'address', 'city', 'zip', 'dateOfBirth', 'ssn',
      'accidentDate', 'accidentTime', 'accidentLocation', 'accidentDescription', 'passenger', 'passengerName', 'workAtAccident',
      'defendant1Name', 'defendant1Address', 'defendant1Carrier', 'defendant1CarrierPhone', 'defendant1Year', 'defendant1Make', 'defendant1Model', 'defendant1Damage',
      'defendant2Name', 'defendant2Address', 'defendant2Carrier', 'defendant2CarrierPhone', 'defendant2Year', 'defendant2Make', 'defendant2Model', 'defendant2Damage',
      'autoName', 'autoPhone', 'autoAddress', 'autoAgent', 'autoPolicy', 'autoClaim', 'autoAdditionalinfo',
      'healthCarrier', 'healthPhone', 'healthAddress', 'healthPolicy', 'healthClaim', 'healthAdjuster', 'healthAgent', 'healthAdditionalinfo',
      'medicare', 'medicareNumber', 'medicaid', 'medicaidNumber',
      'ambulance', 'ambulanceCompany', 'admitted', 'lengthOfStay',
      'doctorHospital1', 'address1', 'phone1', 'treatmentDate1',
      'doctorHospital2', 'address2', 'phone2', 'treatmentDate2',
      'bodyPartsAffected', 'priorInjuries', 'priorDoctorHospital', 'priorHospitalAddressPhone', 'priorTreatmentDetails', 'priorTreatmentFrom', 'priorTreatmentTo', 'priorInsuranceClaims', 'priorAttorneys',
      'currentTreatment', 'currentDoctorHospital', 'currentHospitalAddressPhone', 'currentTreatmentDetails', 'currentTreatmentFrom', 'currentTreatmentTo',
      'hearAboutUs', 'hearAboutUsDetail', 'referenceId'
    ];

    // Date fields that need to be converted to Date objects
    const dateFields = [
      'dateOfBirth', 'accidentDate', 'treatmentDate1', 'treatmentDate2',
      'priorTreatmentFrom', 'priorTreatmentTo', 'currentTreatmentFrom', 'currentTreatmentTo'
    ];

    // Transform draftFields to match schema field names and filter allowed fields
    const transformedFields: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field === 'phoneNumber') {
        transformedFields[field] = draftFields.phone;
      } else if (field === 'dateOfBirth') {
        transformedFields[field] = draftFields.dob ? new Date(draftFields.dob) : null;
      }
      else if (field === 'referenceId') {
        transformedFields[field] = referenceId
      }
      else if (dateFields.includes(field) && draftFields[field]) {
        transformedFields[field] = new Date(draftFields[field]);
      } else if (draftFields[field] !== undefined) {
        transformedFields[field] = draftFields[field];
      }
    }

    console.log("transformedFields", transformedFields);

    type IntakeInfoCreate = Parameters<typeof prisma.intakeInfo.create>[0]['data'];
    type IntakeInfoUpdate = Parameters<typeof prisma.intakeInfo.update>[0]['data'];

    let savedIntake;
    if (existingIntake) {
      savedIntake = await prisma.intakeInfo.update({
        where: { id: existingIntake.id },
        data: {
          ...transformedFields,
          isDraft: true,
        } as IntakeInfoUpdate,
      });
    } else {
      savedIntake = await prisma.intakeInfo.create({
        data: {
          ...transformedFields,
          isDraft: true,
        } as IntakeInfoCreate,
      });
    }

    return NextResponse.json({ message: "Draft saved", id: savedIntake.id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to save draft" }, { status: 500 });
  }
}
