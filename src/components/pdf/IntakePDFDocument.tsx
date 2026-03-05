import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles } from './styles';
import { formatDate } from './utils';
import { IntakeData } from '@/types/intake';
import Image from "next/image";


// import LegacoreLogo from '../../../public/assets/images/legacore/Legacore-Infomatics-logo.png';
// const LegacoreLogo = "../../../public/assets/images/legacore/Legacore-Infomatics-logo.png";
const InfoRow = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
  <View style={styles.infoItem}>
    <Text>
      <Text style={styles.label}>{label}:</Text> {value || 'N/A'}
    </Text>
  </View>
);

const InfoRowFull = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
  <View style={styles.infoItemFull}>
    <Text>
      <Text style={styles.label}>{label}:</Text> {value || 'N/A'}
    </Text>
  </View>
);

const IntakePDFDocument = ({ intake }: { intake: IntakeData }) => (
  <Document>
    <Page size="LETTER" style={styles.page}>
      {/* Header */}
      <View style={styles.header} fixed>
        <View></View>
        <Image
          src="/Legacore-Infomatics-logo.png"
          alt=""
          style={styles.logoImage}
        />
      </View>

      {/* Title */}
      <Text style={styles.title}>Case Intake Report</Text>

      {/* Plaintiff Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Plaintiff Information</Text>
        <View style={styles.infoGrid}>
          <InfoRow label="Name" value={intake.clientName} />
          <InfoRow label="Gender" value={intake.gender} />
          <InfoRow label="Phone" value={intake.phoneNumber} />
          <InfoRow label="Email" value={intake.email} />
          <InfoRow label="Address" value={intake.address} />
          <InfoRow label="City" value={intake.city} />
          <InfoRow label="Zip" value={intake.zip} />
          <InfoRow label="Date of Birth" value={formatDate(intake.dateOfBirth)} />
        </View>
      </View>

      {/* Accident Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Accident Information</Text>
        <View style={styles.infoGrid}>
          <InfoRow label="Date" value={formatDate(intake.accidentDate)} />
          <InfoRow label="Time" value={intake.accidentTime} />
          <InfoRowFull label="Location" value={intake.accidentLocation} />
          <InfoRowFull label="Description" value={intake.accidentDescription} />
        </View>
      </View>

      {/* Defendant 1 Information */}
      {intake.defendant1Name && (
        <View style={styles.section} break={true}>
          <Text style={styles.sectionTitle}>Defendant 1 Information</Text>
          <View style={styles.infoGrid}>
            <InfoRow label="Name" value={intake.defendant1Name} />
            <InfoRow label="Phone" value={intake.defendant1Phone} />
            <InfoRowFull label="Address" value={intake.defendant1Address} />
            <InfoRow label="Carrier" value={intake.defendant1Carrier} />
            <InfoRow label="Carrier Phone" value={intake.defendant1CarrierPhone} />
            <InfoRow label="Policy" value={intake.defendant1Policy} />
            <InfoRow label="Vehicle Year" value={intake.defendant1Year} />
            <InfoRow label="Make" value={intake.defendant1Make} />
            <InfoRow label="Model" value={intake.defendant1Model} />
            <InfoRow label="Damage" value={intake.defendant1Damage} />
          </View>
        </View>
      )}

      {/* Defendant 2 Information */}
      {intake.defendant2Name && (
        <View style={styles.section} break={true}>
          <Text style={styles.sectionTitle}>Defendant 2 Information</Text>
          <View style={styles.infoGrid}>
            <InfoRow label="Name" value={intake.defendant2Name} />
            <InfoRow label="Phone" value={intake.defendant2Phone} />
            <InfoRowFull label="Address" value={intake.defendant2Address} />
            <InfoRow label="Carrier" value={intake.defendant2Carrier} />
            <InfoRow label="Carrier Phone" value={intake.defendant2CarrierPhone} />
            <InfoRow label="Policy" value={intake.defendant2Policy} />
            <InfoRow label="Vehicle Year" value={intake.defendant2Year} />
            <InfoRow label="Make" value={intake.defendant2Make} />
            <InfoRow label="Model" value={intake.defendant2Model} />
            <InfoRow label="Damage" value={intake.defendant2Damage} />
          </View>
        </View>
      )}

      {/* Auto Insurance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Auto Insurance</Text>
        <View style={styles.infoGrid}>
          <InfoRow label="Name" value={intake.autoName} />
          <InfoRow label="Phone" value={intake.autoPhone} />
          <InfoRowFull label="Address" value={intake.autoAddress} />
          <InfoRow label="Carrier" value={intake.autoCarrier} />
          <InfoRow label="Agent" value={intake.autoAgent} />
          <InfoRow label="Policy" value={intake.autoPolicy} />
        </View>
      </View>

      {/* Health Insurance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Health Insurance</Text>
        <View style={styles.infoGrid}>
          <InfoRow label="Carrier" value={intake.healthCarrier} />
          <InfoRow label="Phone" value={intake.healthPhone} />
          <InfoRow label="Type" value={intake.healthType} />
          <InfoRowFull label="Address" value={intake.healthAddress} />
          <InfoRow label="Group" value={intake.healthGroup} />
          <InfoRow label="Policy" value={intake.healthPolicy} />
        </View>
      </View>

      {/* Medical Treatment */}
      <View style={styles.section} break={true}>
        <Text style={styles.sectionTitle}>Medical Treatment</Text>
        <View style={styles.infoGrid}>
          <InfoRow label="Ambulance" value={intake.ambulance ? 'Yes' : 'No'} />
          <InfoRow label="Ambulance Company" value={intake.ambulanceCompany} />
          <InfoRow label="Admitted" value={intake.admitted ? 'Yes' : 'No'} />
          <InfoRow label="Length of Stay" value={intake.lengthOfStay} />
        </View>

        {/* Treatment 1 */}
        {intake.doctorHospital1 && (
          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>Treatment 1</Text>
            <InfoRowFull label="Doctor/Hospital" value={intake.doctorHospital1} />
            <InfoRowFull label="Address" value={intake.address1} />
            <InfoRow label="Phone" value={intake.phone1} />
            <InfoRow label="Treatment Date" value={formatDate(intake.treatmentDate1)} />
          </View>
        )}

        {/* Treatment 2 */}
        {intake.doctorHospital2 && (
          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>Treatment 2</Text>
            <InfoRowFull label="Doctor/Hospital" value={intake.doctorHospital2} />
            <InfoRowFull label="Address" value={intake.address2} />
            <InfoRow label="Phone" value={intake.phone2} />
            <InfoRow label="Treatment Date" value={formatDate(intake.treatmentDate2)} />
          </View>
        )}

        {/* Treatment 3 */}
        {intake.doctorHospital3 && (
          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>Treatment 3</Text>
            <InfoRowFull label="Doctor/Hospital" value={intake.doctorHospital3} />
            <InfoRowFull label="Address" value={intake.address3} />
            <InfoRow label="Phone" value={intake.phone3} />
            <InfoRow label="Treatment Date" value={formatDate(intake.treatmentDate3)} />
          </View>
        )}
      </View>

      {/* Injuries */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Injuries</Text>
        <InfoRowFull label="Body Parts Affected" value={intake.bodyPartsAffected} />
        <InfoRowFull label="Prior Injuries" value={intake.priorInjuries} />
        <InfoRowFull label="Prior Insurance Claims" value={intake.priorInsuranceClaims} />
        <InfoRowFull label="Prior Attorneys" value={intake.priorAttorneys} />
      </View>

      {/* Footer */}
      <Text style={styles.footer} fixed>
        LEGACORE INFORMATICS
      </Text>
    </Page>
  </Document>
);

export default IntakePDFDocument;
